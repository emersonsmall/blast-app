const https = require("https");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const unzipper = require("unzipper");
const { spawn } = require("child_process");

const jobModel = require("../models/jobModel");
const resultModel = require("../models/resultModel");
const genomeModel = require("../models/genomeModel");
const config = require("../config");

const genbankApiBaseUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2";
const dataDir = path.join(process.cwd(), "data");

// TODO: handle case where taxon returns multiple reference genomes
// TODO: check if job already exists/if results already available for user and taxon pair before creating a new one (HANDLE MULTIPLE REQUESTS GRACEFULLY)
// TODO: taxon -> accession ID relationship exists in jobs table. could use to avoid multiple API calls

// Synchronous to allow controller to respond immediately
exports.createJob = async (queryTaxon, targetTaxon, userId) => {
    const newJob = await jobModel.create({ userId, queryTaxon, targetTaxon });
    processBlastJob(newJob); // run asynchronously
    return newJob;
};


async function processBlastJob(job) {
    try {
        console.log(`Job ${job.id}: Getting genome data`);
        jobModel.updateById(job.id, { status: "getting_genomes" });
        const queryGenome = await getGenome(job.queryTaxon, job.id);
        const targetGenome = await getGenome(job.targetTaxon, job.id);

        console.log(`Job ${job.id}: Running BLAST`);
        jobModel.updateById(job.id, { 
            status: "running_blast",
            query_accession: queryGenome.id, 
            target_accession: targetGenome.id 
        });
        const blastResult = await runBlast(queryGenome, targetGenome, job.id);

        if (blastResult.error) {
            throw new Error(blastResult.error);
        }

        newResult = await resultModel.create(blastResult.top_hit);
        console.log(JSON.stringify(newResult));

        await jobModel.updateById(job.id, { status: "completed", result_id: newResult.id });
        console.log(`Job ${job.id}: Completed successfully`);

    } catch (err) {
        console.error(`Job ${job.id} failed: ${err.stack}`);
        await jobModel.updateById(job.id, { status: "failed" });
    }
}

async function getGenome(taxon, jobId) {
    console.log(`Job ${jobId}: Preparing genome for ${taxon}`);

    // Get accession ID for the given taxon from GenBank API
    const reportUrl = `${genbankApiBaseUrl}/genome/taxon/${encodeURIComponent(taxon)}/dataset_report?filters.reference_only=true`;
    const reportRes = await apiRequest(reportUrl, config.genbankApiKey);
    
    if (!reportRes.reports || reportRes.reports.length === 0) {
        throw new Error(`No reference genome/s found for taxon/s ${taxon}.`);
    }

    const report = reportRes.reports[0]; // always take first result
    const id = report.accession;

    const genomeData = {
        id: id,
        organismName: report.organism.organism_name,
        commonName: report.organism.common_name, // not always provided
        totalSequenceLength: report.assembly_stats.total_sequence_length,
        totalGeneCount: report.annotation_info.stats.gene_counts.total
    };
    console.log(`Job ${jobId}: Genome data: ${JSON.stringify(genomeData)}`);

    // Add genome to database
    await genomeModel.create(genomeData).catch(err => {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
    });

    // Download FASTA and GFF files if they don't already exist
    const extractionDir = path.join(dataDir, id);
    const tempDir = path.join(dataDir, "temp");

    if (!await pathExists(extractionDir)) {
        console.log(`Job ${jobId}: Downloading files for ${id}`);
        const downloadUrl = `${genbankApiBaseUrl}/genome/accession/${id}/download?include_annotation_type=GENOME_FASTA&include_annotation_type=GENOME_GFF`;
        await fsp.mkdir(tempDir, { recursive: true });
        const zipFilePath = path.join(tempDir, `${id}.zip`);
    
        await downloadFile(downloadUrl, zipFilePath, config.genbankApiKey);
    
        // Extract relevant files from ZIP archive
        console.log(`Job ${jobId}: Unzipping files to ${extractionDir}`);
        await fsp.mkdir(extractionDir);
        await extractFiles(zipFilePath, extractionDir);
    
        await fsp.unlink(zipFilePath); // delete ZIP file after extraction
    } else {
        console.log(`Job ${jobId}: FASTA and GFF files already downloaded and extracted.`);
    }

    await fsp.rmdir(tempDir).catch(() => {}); // delete temp dir if empty

    const fastaPath = await findFileByExt(extractionDir, ".fna");
    const gffPath = await findFileByExt(extractionDir, ".gff");

    if (!fastaPath || !gffPath) {
        throw new Error(`Failed to find GFF or FASTA file for accession ID ${id}`);
    }

    return { fastaPath, gffPath, id };
}


function runBlast(queryGenome, targetGenome, jobId) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), "scripts", "blast_workflow.py");
        const args = [
            scriptPath,
            queryGenome.fastaPath,
            queryGenome.gffPath,
            targetGenome.fastaPath,
            targetGenome.gffPath,
            jobId.toString()
        ];

        const pythonProcess = spawn("python3", args);

        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`BLAST script failed with code ${code}: ${error}`));
            }
            try {
                resolve(JSON.parse(result));
            } catch (err) {
                reject(new Error(`Failed to parse BLAST result: ${err.message}`));
            }
        });
    });
}


// --- HELPER FUNCTIONS ---
async function findFileByExt(dir, ext) {
    try {
        const files = await fsp.readdir(dir);
        const foundFile = files.find(file => file.endsWith(ext));
        return foundFile ? path.join(dir, foundFile) : null;
    } catch (err) {
        console.error(`Error reading directory ${dir}: ${err.message}`);
        return null;
    }
}

async function pathExists(path) {
    try {
        await fsp.access(path);
        return true;
    } catch (err) {
        return false;
    }
}

async function extractFiles(zipFilePath, destDir) {
    const dir = await unzipper.Open.file(zipFilePath);

    const relevantFiles = dir.files.filter(file => file.path.endsWith('.fna') || file.path.endsWith('.gff'));

    const extractionPromises = relevantFiles.map(file => {
        return new Promise((resolve, reject) => {
            const fileName = path.basename(file.path);
            const destPath = path.join(destDir, fileName);

            file.stream()
                .pipe(fs.createWriteStream(destPath))
                .on('finish', resolve)
                .on('error', reject);
        });
    });

    await Promise.all(extractionPromises);
}
/**
 * Helper for API requests that return JSON
 */
function apiRequest(url, apiKey) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "Accept": "application/json", "api-key": apiKey } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Request failed with status code ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', err => reject(err));
  });
}


/**
 * Helper to download a file from a URL, handling redirects
 */
function downloadFile(url, dest, apiKey) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const request = (url) => {
      https.get(url, { headers: { "api-key": apiKey }}, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // follow redirect
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download file: ${res.statusCode}`));
        }
        res.pipe(file);
      });
    };

    request(url);

    file.on('finish', () => file.close(resolve));
    file.on('error', (err) => {
      fs.unlink(dest, () => {}); // delete the file if error occurs
      reject(err.message);
    });
  });
}