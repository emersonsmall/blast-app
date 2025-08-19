const https = require("https");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

// TODO FIRST: add bioinformatics processing of FASTA files
// TODO: separate download and processing steps - allow user to download ZIP and process later - 2 endpoints??
// TODO: create jobs DB?
// TODO: add results to jobs database, or new resuls table with job ID
// TODO: use S3 for storing genome files instead of local filesystem

const jobs = [];

const genbankApiBaseUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2";

exports.createJob = async (req, res) => {
  const { taxons, processingType } = req.body;
  const userId = req.user.id; // user ID from JWT middleware

  const newJob = {
    id: jobs.length + 1,
    userId,
    taxons: taxons,
    processingType,
    status: "pending",
    createdAt: new Date(),
  };

  jobs.push(newJob);

  res.status(202).json({
    id: newJob.id,
    status: newJob.status,
    message: "Job accepted and is now pending.",
  });

  processJob(newJob);
};

/**
 * Processes a job by downloading a GenBank ZIP archive, extracting FASTA files, and performing bioinformatics processing.
 * @param {Object} job - The job object containing details like taxon and processing type.
 */
async function processJob(job) {
  let zipFilePath = '';
  let extractionDir = '';
  const tempDir = path.join(process.cwd(), "data", "temp");

  try {
    // get accession ID from GenBank
    job.status = "fetching_accession_id";
    console.log(`Job ${job.id} fetching accession ID for: ${job.taxons}`);
    const reportUrl = `${genbankApiBaseUrl}/genome/taxon/${encodeURIComponent(job.taxons)}/dataset_report?filters.reference_only=true`;
    const reportRes = await apiRequest(reportUrl);
    
    if (!reportRes.reports || reportRes.reports.length === 0) {
      throw new Error(`No reference genome/s found for taxon/s ${job.taxons}.`);
    }

    const accessionId = reportRes.reports[0].accession;
    console.log(`Job ${job.id} found accession ID: ${accessionId}`);
    
    zipFilePath = path.join(tempDir, `${accessionId}.zip`);
    extractionDir = path.join(process.cwd(), "data", accessionId);
    
    if (!fs.existsSync(extractionDir)) {
      // stream download to ZIP
      job.status = "downloading_zip";
      const downloadUrl = `${genbankApiBaseUrl}/genome/accession/${accessionId}/download?include_annotation_type=GENOME_FASTA&include_annotation_type=GENOME_GFF`;
      
      // create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      console.log(`Job ${job.id} downloading ZIP for accession ID: ${accessionId}`);
      await downloadFile(downloadUrl, zipFilePath);
      console.log(`Job ${job.id} downloaded ZIP to: ${zipFilePath}`);
      
      // unzip and extract
      job.status = "extracting_files";
      console.log(`Job ${job.id} extracting files to: ${extractionDir}`);

      await unzipAndExtractFasta(zipFilePath, extractionDir);
      console.log(`Job ${job.id} FASTA file found`);
    } else {
      console.log(`Job ${job.id} FASTA already exists at: ${extractionDir}`);
    }

    // process fasta file
    job.status = "processing";
    console.log(`Job ${job.id} processing FASTA file`);

    // result = ...

    // update job status to completed
    job.status = "completed";
    console.log(`Job ${job.id} completed successfully`);
    
  } catch (err) {
    console.error(`Job ${job.id} failed`, err.message);
    job.status = "failed";
    job.error = err.message;
  }

  finally {
    // remove temp ZIP file if it exists
    if (fs.existsSync(zipFilePath)) {
      fs.rm(zipFilePath);
      console.log(`Job ${job.id} deleted ZIP file: ${zipFilePath}`);
    }

    try {
      const files = fs.readdirSync(tempDir);
      if (files.length === 0) {
        fs.rmdirSync(tempDir);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Error deleting temp directory:`, err.message);
      }
    }
  }
}

// --- HELPER FUNCTIONS ---

/**
 * Unzips a GenBank ZIP archive and extracts the relevant FASTA files.
 * @param {string} zipPath - Path to the ZIP file.
 * @param {string} extractionPath - Directory to extract files to.
 * @return {Promise<string>} - Path to the extracted FASTA file.
 */
async function unzipAndExtractFasta(zipPath, extractionPath) {
  const dir = await unzipper.Open.file(zipPath);
  let fastaFile = dir.files.find(file => file.path.endsWith('.fna') || file.path.endsWith('.fa'));

  if (!fastaFile) {
    throw new Error("No FASTA file found in the ZIP archive.");
  }

  const fastaFilePath = path.join(extractionPath, path.basename(fastaFile.path));
  if (!fs.existsSync(extractionPath)) fs.mkdirSync(extractionPath, {recursive: true});

  return new Promise((resolve, reject) => {
    fastaFile.stream()
      .pipe(fs.createWriteStream(fastaFilePath))
      .on('finish', () => resolve(fastaFilePath))
      .on('error', reject);
  });
}

/**
 * Generic helper for API requests that return JSON
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