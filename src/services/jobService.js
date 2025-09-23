const https = require("https");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const unzipper = require("unzipper");
const { spawn } = require("child_process");
const os = require("os");

const jobModel = require("../models/jobModel");
const resultModel = require("../models/resultModel");
const genomeModel = require("../models/genomeModel");
const config = require("../config");
const s3  = require("../config/s3");

const { PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const GENBANK_API_BASE_URL = "https://api.ncbi.nlm.nih.gov/datasets/v2";
const POSTGRES_UNIQUE_VIOLATION = '23505';

// TODO: handle case where taxon returns multiple reference genomes
// TODO: check if job already exists/if results already available for user and taxon pair before creating a new one (HANDLE MULTIPLE REQUESTS GRACEFULLY)
// TODO: check where python script outputs files

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
            query_accession: queryGenome.accession, 
            target_accession: targetGenome.accession
        });
        const top_hit = await runBlast(queryGenome, targetGenome, job.id);

        if (top_hit.error) {
            throw new Error(top_hit.error);
        }

        newResult = await resultModel.create(top_hit);
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

    // Get accession ID for the given taxon
    const reportUrl = `${GENBANK_API_BASE_URL}/genome/taxon/${encodeURIComponent(taxon)}/dataset_report?filters.reference_only=true`;
    const reportRes = await apiRequest(reportUrl, config.genbankApiKey);
    
    if (!reportRes.reports || reportRes.reports.length === 0) {
        throw new Error(`No reference genome/s found for taxon/s ${taxon}.`);
    }

    const report = reportRes.reports[0]; // always take first result
    const accession = report.accession;

    const genomeData = {
        id: accession,
        organismName: report.organism.organism_name,
        commonName: report.organism.common_name, // not always provided
        totalSequenceLength: report.assembly_stats.total_sequence_length,
        totalGeneCount: report.annotation_info.stats.gene_counts.total
    };

    // Add genome to database
    await genomeModel.create(genomeData).catch(err => {
        if (err.code !== POSTGRES_UNIQUE_VIOLATION) throw err;
    });

    const fastaKey = `${accession}/${accession}.fna`;
    const gffKey = `${accession}/${accession}.gff`;

    const fastaExists = await s3ObjectExists(config.aws.s3BucketName, fastaKey);
    const gffExists = await s3ObjectExists(config.aws.s3BucketName, gffKey);
    
    if (!fastaExists || !gffExists) {
        console.log(`Job ${jobId}: Downloading files for ${accession}`);
        const downloadUrl = `${GENBANK_API_BASE_URL}/genome/accession/${accession}/download?include_annotation_type=GENOME_FASTA,GENOME_GFF`;
        
        const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "blast-"));
        const zipFilePath = path.join(tempDir, `${accession}.zip`);
        
        await downloadFile(downloadUrl, zipFilePath, config.genbankApiKey);
        
        // Extract relevant files from ZIP archive
        console.log(`Job ${jobId}: Unzipping files to ${tempDir}`);
        await extractFiles(zipFilePath, tempDir);
        
        const fastaPath = await findFileByExt(tempDir, ".fna");
        const gffPath = await findFileByExt(tempDir, ".gff");
        
        if (!fastaPath || !gffPath) {
            throw new Error(`Failed to find GFF or FASTA for accession ${accession}.`);
        }
        
        console.log(`Job ${jobId}: Uploading files to S3`);
        await uploadFileToS3(config.aws.s3BucketName, fastaKey, fastaPath);
        await uploadFileToS3(config.aws.s3BucketName, gffKey, gffPath);

        await fsp.rm(tempDir, { recursive: true, force: true });
    } else {
        console.log(`Job ${jobId}: FASTA and GFF files already exist in S3.`);
    }

    const fastaCmd = new GetObjectCommand({ Bucket: config.aws.s3BucketName, Key: fastaKey });
    const fastaUrl = await getSignedUrl(s3, fastaCmd, { expiresIn: 3600 });

    const gffCmd = new GetObjectCommand({ Bucket: config.aws.s3BucketName, Key: gffKey });
    const gffUrl = await getSignedUrl(s3, gffCmd, { expiresIn: 3600 });

    return { fastaUrl, gffUrl, accession };
}


function runBlast(queryGenome, targetGenome, jobId) {
    return new Promise((resolve, reject) => {
        const args = [
            "blast_workflow.py",
            queryGenome.fastaUrl,
            queryGenome.gffUrl,
            targetGenome.fastaUrl,
            targetGenome.gffUrl,
            jobId.toString()
        ];

        const pythonProcess = spawn("python", args, { cwd: "scripts" });

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

async function s3ObjectExists(bucket, key) {
    try {
        const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
        await s3.send(command);
        return true;
    } catch (err) {
        if (err.name === 'NotFound') {
            return false;
        }
        throw err;
    }
}

async function uploadFileToS3(bucket, key, filePath) {
    const fileStream = fs.createReadStream(filePath);
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream
    });
    return s3.send(command);
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