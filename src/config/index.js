if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables.");
}

const requiredAwsVars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_REGION", "S3_BUCKET_NAME"];
for (const awsVar of requiredAwsVars) {
  if (!process.env[awsVar]) {
    throw new Error(`${awsVar} is not defined in environment variables.`);
  }
}

module.exports = {
  port: process.env.PORT || 3000,

  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "blast_user",
    password: process.env.DB_PASSWORD || "blast_password",
    database: process.env.DB_NAME || "blast_app_db"
  },

  jwtSecret: process.env.JWT_SECRET,

  genbankApiKey: process.env.GENBANK_API_KEY,

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: process.env.AWS_REGION || "ap-southeast-2",
    s3BucketName: process.env.S3_BUCKET_NAME
  }
}