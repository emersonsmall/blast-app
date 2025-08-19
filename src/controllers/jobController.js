const https = require("https");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const jobs = []; // TODO: replace with job DB

// TODO: check if genome file/s already exist before downloading

const genbankApiBaseUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2";

exports.createJob = async (req, res) => {
  const { taxons, processingType } = req.body;
  const userId = req.user.id; // user ID from JWT middleware

  const newJob = {
    id: jobs.length + 1,
    userId,
    taxon: taxons,
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

  let tempZipPath = '';
  let extractionPath = '';

  try {
    // get accession ID from GenBank
    newJob.status = "fetching_accession_id";
    console.log(`Job ${newJob.id} fetching accession ID for: ${taxons}`);
    const reportUrl = `${genbankApiBaseUrl}/genome/taxon/${encodeURIComponent(taxons)}/dataset_report?filters.reference_only=true`;
    const reportRes = await apiRequest(reportUrl);
    
    if (!reportRes.reports || reportRes.reports.length === 0) {
      throw new Error(`No reference genomes found for the taxon/s ${taxons}.`);
    }

    const accessionId = reportRes.reports[0].accession;
    console.log(`Job ${newJob.id} found accession ID: ${accessionId}`);

    // stream download to ZIP
    newJob.status = "downloading_zip";
    console.log(`Job ${newJob.id} downloading ZIP for accession ID: ${accessionId}`);
    const downloadUrl = `${genbankApiBaseUrl}/genome/accession/${accessionId}/download?include_annotation_type=GENOME_FASTA&include_annotation_type=GENOME_GFF`;

    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    tempZipPath = path.join(tempDir, `${newJob.id}_${accessionId}.zip`);

    await downloadFile(downloadUrl, tempZipPath);
    console.log(`Job ${newJob.id} downloaded ZIP to: ${tempZipPath}`);

    // unzip and extract
    newJob.status = "extracting_files";
    extractionPath = path.join(tempDir, `${newJob.id}_extracted`);
    console.log(`Job ${newJob.id} extracting files to: ${extractionPath}`);

    const fastaFilePath = await unzipAndExtractFasta(tempZipPath, extractionPath);
    console.log(`Job ${newJob.id} FASTA file found at: ${fastaFilePath}`);

    // process fasta file
    newJob.status = "processing";
    console.log(`Job ${newJob.id} processing FASTA file: ${fastaFilePath}`);



    // update job status to completed

  } catch (err) {
    console.error(`Job ${newJob.id} failed`, err.message);
    newJob.status = "failed";
    res.status(500).json({
      id: newJob.id,
      status: newJob.status,
      message: `Job processing failed: ${err.message}`,
    });
  }

};

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