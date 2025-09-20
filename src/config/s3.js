const { S3Client } = require("@aws-sdk/client-s3");
const config = require("./index");

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    sessionToken: config.aws.sessionToken
  }
});

module.exports = s3;