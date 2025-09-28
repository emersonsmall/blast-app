// src/config/s3.js
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");

const { config } = require("./index"); // Import the config object

let s3Client;

/**
 * Initializes and returns a singleton S3 client instance.
 * Ensures the client is created only after the config is loaded.
 */
const getS3Client = () => {
    if (!s3Client) {
        if (!config.aws) {
            throw new Error("AWS config is not loaded. Cannot create S3 client.");
        }
        s3Client = new S3Client({
            region: config.aws.region,
        });
    }
    return s3Client;
};

/**
 * Checks if an object exists in S3.
 */
async function s3ObjectExists(bucket, key) {
    try {
        const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
        await s3Client.send(command);
        return true;
    } catch (err) {
        if (err.name === 'NotFound') {
            return false;
        }
        throw err;
    }
}

/**
 * Uploads a file to S3 from the given file path.
 */
async function uploadFileToS3(bucket, key, filePath) {
    const fileStream = fs.createReadStream(filePath);
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream
    });
    return s3Client.send(command);
}

module.exports = {
    getS3Client,
    s3ObjectExists,
    uploadFileToS3
};