const https = require("https");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const unzipper = require("unzipper");
const { spawn } = require("child_process");

const jobs = [];
const genbankApiBaseUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2";
const dataDir = path.join(process.cwd(), "data");

// TODO: create jobs DB?
// TODO: handle case where taxon returns multiple genomes (e.g. E. coli)
// TODO: add results to jobs database, or resuls table with job ID?
// TODO: use S3 for storing gff/fasta/fai/cds files
// TODO: check if job already exists/if results already available for user and taxon pair before creating a new one (HANDLE MULTIPLE REQUESTS GRACEFULLY)

// Synchronous to allow controller to respond immediately
exports.createJob = (queryTaxon, targetTaxon, userId) => {
    const newJob = {
        id: jobs.length + 1,
        userId,
        taxons: { query: queryTaxon, target: targetTaxon },
        status: "pending",
        createdAt: new Date(),
        results: null,
    };
    jobs.push(newJob);

    processComparativeJob(newJob); // long-running task

    return newJob;
};


async function processComparativeJob(job) {
    try {
        job.status = "preparing_genomes";
        console.log(`Job ${job.id}: Preparing genome data`);
        const queryGenome = await prepareGenome(job.taxons.query, job.id);
        const targetGenome = await prepareGenome(job.taxons.target, job.id);

        job.status = "running_blast";
        console.log(`Job ${job.id}: Running BLAST`);
        const blastResult = await runBlast(queryGenome, targetGenome, job.id);

        if (blastResult.error) {
            throw new Error(blastResult.error);
        }

        job.results = blastResult;
        job.status = "completed";
        console.log(`Job ${job.id}: ${JSON.stringify(job.results)}`);
        console.log(`Job ${job.id}: Completed successfully`);

    } catch (err) {
        console.error(`Job ${job.id} failed: ${err.stack}`);
        job.status = "failed";
        job.error = err.message;
    }
}

async function prepareGenome(taxon, jobId) {
    console.log(`Job ${jobId}: Preparing genome for ${taxon}`);
    // get accession ID from GenBank
    const reportUrl = `${genbankApiBaseUrl}/genome/taxon/${encodeURIComponent(taxon)}/dataset_report?filters.reference_only=true`;
    const reportRes = await apiRequest(reportUrl);
    
    if (!reportRes.reports || reportRes.reports.length === 0) {
        throw new Error(`No reference genome/s found for taxon/s ${taxon}.`);
    }

    const accessionId = reportRes.reports[0].accession;
    console.log(`Job ${jobId} found accession ID: ${accessionId}`);
    
    extractionDir = path.join(dataDir, accessionId);

    if (fs.existsSync(extractionDir)) {
        const gffFile = findFileByExt(extractionDir, ".gff");
        const fastaFile = findFileByExt(extractionDir, ".fna");
        if (gffFile && fastaFile) {
            console.log(`Job ${jobId}: FASTA and GFF files already downloaded and extracted.`);
            return { fastaPath: fastaFile, gffPath: gffFile };
        }
    }

    console.log(`Job ${jobId}: Downloading files for ${accessionId}`);
    const downloadUrl = `${genbankApiBaseUrl}/genome/accession/${accessionId}/download?include_annotation_type=GENOME_FASTA&include_annotation_type=GENOME_GFF`;
    const tempDir = path.join(dataDir, "temp");
    await fsp.mkdir(tempDir, { recursive: true });
    const zipFilePath = path.join(tempDir, `${accessionId}.zip`);

    await downloadFile(downloadUrl, zipFilePath);

    console.log(`Job ${jobId}: Unzipping files to ${extractionDir}`);
    await fsp.mkdir(extractionDir, { recursive: true });
    await extractFiles(zipFilePath, extractionDir);

    await fsp.unlink(zipFilePath); // delete ZIP file after extraction
    // delete temp directory if empty

    const fastaPath = findFileByExt(extractionDir, ".fna");
    const gffPath = findFileByExt(extractionDir, ".gff");

    if (!fastaPath || !gffPath) {
        throw new Error(`Failed to find GFF or FASTA files for accession ID ${accessionId}`);
    }

    return { fastaPath, gffPath };
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

        const pythonProcess = spawn("python", args);

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


// --- HELPERS ---

function findFileByExt(dir, ext) {
    const files = fs.readdirSync(dir);
    const foundFile = files.find(file => file.endsWith(ext));
    return foundFile ? path.join(dir, foundFile) : null;
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
function apiRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "Accept": "application/json" } }, (res) => {
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
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const request = (url) => {
      https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // follow redirect
          return request(response.headers.location);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download file: ${response.statusCode}`));
        }
        response.pipe(file);
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