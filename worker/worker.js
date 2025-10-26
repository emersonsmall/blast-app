const { loadConfig, config } = require("../src/config");
const jobModel = require("../src/models/jobModel");
const resultModel = require("../src/models/resultModel");
const genomeModel = require("../src/models/genomeModel");
const { dbInit } = require("../src/config/db");
const { getS3Client, s3ObjectExists, uploadFileToS3 }  = require("../src/config/s3");

const https = require("https");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const unzipper = require("unzipper");
const { spawn } = require("child_process");
const os = require("os");

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");


const POSTGRES_UNIQUE_VIOLATION = '23505';

let sqsClient;
let s3Client;

// TODO: check if job already exists/if results already available for user and taxon pair before creating a new one (HANDLE MULTIPLE REQUESTS GRACEFULLY)

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
    const reportUrl = `${config.genbankApiBaseUrl}/genome/taxon/${encodeURIComponent(taxon)}/dataset_report?filters.reference_only=true`;
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
        // ignore duplicate entry errors
        if (err.code !== POSTGRES_UNIQUE_VIOLATION) throw err;
    });

    const fastaKey = `${accession}/${accession}.fna`;
    const gffKey = `${accession}/${accession}.gff`;

    const fastaExists = await s3ObjectExists(config.aws.s3BucketName, fastaKey);
    const gffExists = await s3ObjectExists(config.aws.s3BucketName, gffKey);
    
    if (!fastaExists || !gffExists) {
        console.log(`Job ${jobId}: Downloading files for ${accession}`);
        const downloadUrl = `${config.genbankApiBaseUrl}/genome/accession/${accession}/download?include_annotation_type=GENOME_FASTA,GENOME_GFF`;
        
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
    const fastaUrl = await getSignedUrl(s3Client, fastaCmd, { expiresIn: 3600 });

    const gffCmd = new GetObjectCommand({ Bucket: config.aws.s3BucketName, Key: gffKey });
    const gffUrl = await getSignedUrl(s3Client, gffCmd, { expiresIn: 3600 });

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
/**
 * Finds a file with the given extension in the specified directory.
 */
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

/**
 * Extracts .fna and .gff files from a ZIP archive to the specified directory.
 */
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
 * Handles API requests that return JSON
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
 * Downloads a file from a URL, handling redirects
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


const pollQueue = async () => {
    console.log("[worker.js] Starting worker, polling SQS for messages...");
    while (true) {
        try {
            const receiveCommand = new ReceiveMessageCommand({
                QueueUrl: config.aws.sqsQueueUrl,
                MaxNumberOfMessages: 1,
                WaitTimeSeconds: 5,
            });

            const { Messages } = await sqsClient.send(receiveCommand);

            if (Messages && Messages.length > 0) {
                const message = Messages[0];
                const { jobId } = JSON.parse(message.Body);
                console.log(`[worker.js] Received message for job ID ${jobId}`);

                const job = await jobModel.getById(jobId);
                if (job && job.status === "pending") {
                    await processBlastJob(job);
                } else {
                    console.log(`[worker.js] Job ID ${jobId} already processed or not found, skipping.`);
                }

                const deleteCommand = new DeleteMessageCommand({
                    QueueUrl: config.aws.sqsQueueUrl,
                    ReceiptHandle: message.ReceiptHandle
                });
                await sqsClient.send(deleteCommand);
            }   
        } catch (err) {
            console.error(`[worker.js] Error polling SQS: ${err.stack}`);
            await new Promise(res => setTimeout(res, 5000)); // wait before retrying
        }
    }
};

const startWorker = async () => {
    try {
        await loadConfig();
        await dbInit();


        sqsClient = new SQSClient({ region: config.aws.region });
        s3Client = getS3Client();

        pollQueue();
    } catch (err) {
        console.error("FATAL: Failed to start worker", err);
        process.exit(1);
    }
};
startWorker();