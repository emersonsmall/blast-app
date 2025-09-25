require("dotenv").config();

const requiredEnvVars = [
  "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "S3_BUCKET_NAME",
  "JWT_SECRET", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "COGNITO_USER_POOL_ID", "COGNITO_CLIENT_ID", "COGNITO_CLIENT_SECRET",
];
for (const requiredVar of requiredEnvVars) {
  if (!process.env[requiredVar]) {
    throw new Error(`ERROR: ${requiredVar} is not defined in environment variables.`);
  }
}

module.exports = {
  port: process.env.PORT || 3000,

  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },

  jwtSecret: process.env.JWT_SECRET,

  genbankApiKey: process.env.GENBANK_API_KEY,

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: process.env.AWS_REGION || "ap-southeast-2",
    s3BucketName: process.env.S3_BUCKET_NAME,
    cognito: {
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET
    }
  }
}