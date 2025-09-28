require("dotenv").config();

const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

let config = {
  aws: {
    region: process.env.AWS_REGION || "ap-southeast-2"
  }
};

const ROOT_PATH = "/n10763139/";
const PARAMETER_NAMES = [
    `${ROOT_PATH}port`,
    `${ROOT_PATH}genbankApiBaseUrl`,
    `${ROOT_PATH}db/host`,
    `${ROOT_PATH}db/port`,
    `${ROOT_PATH}db/user`,
    `${ROOT_PATH}db/name`,
    `${ROOT_PATH}aws/region`,
    `${ROOT_PATH}aws/sqsQueueUrl`,
    `${ROOT_PATH}aws/s3BucketName`,
    `${ROOT_PATH}aws/cognito/userPoolId`,
    `${ROOT_PATH}aws/cognito/clientId`,
]

const ssmClient = new SSMClient({ region: config.aws.region });
const secretsClient = new SecretsManagerClient({ region: config.aws.region });

/**
 * Fetches parameters from AWS Parameter Store
 */
async function fetchParameters() {
    console.log("Fetching parameters from AWS Parameter Store...");

    const paramPromises = PARAMETER_NAMES.map(name =>
        ssmClient.send(new GetParameterCommand({ Name: name }))
    );

    const responses = await Promise.all(paramPromises);

    responses.forEach(response => {
        // Convert /n10763139/some/key to { some: { key: value } }
        const p = response.Parameter;
        const keys = p.Name.replace(ROOT_PATH, "").split("/");
        let current = config;
        keys.forEach((key, index) => {
            if (index === keys.length - 1) {
                current[key] = p.Value;
            } else {
                current[key] = current[key] || {};
                current = current[key];
            }
        });
    });
    console.log("Parameters fetched successfully.");
}

/**
 * Fetches secrets from AWS Secrets Manager
 */
async function fetchSecrets() {
    console.log("Fetching secrets from AWS Secrets Manager...");
    const command = new GetSecretValueCommand({
        SecretId: "n10763139/secrets"
    });
    const response = await secretsClient.send(command);
    const secrets = JSON.parse(response.SecretString);

    config.db = config.db || {};
    config.aws = config.aws || {};
    config.aws.cognito = config.aws.cognito || {};

    config.db.password = secrets.DB_PASSWORD;
    config.aws.cognito.clientSecret = secrets.COGNITO_CLIENT_SECRET;
    config.genbankApiKey = secrets.GENBANK_API_KEY;
    config.jwtSecret = secrets.JWT_SECRET;

    console.log("Secrets fetched successfully.");
}

/**
 * Loads all configuation and returns the complete config object
 */
async function loadConfig() {
    await Promise.all([
        fetchParameters(),
        fetchSecrets()
    ]);

    return config;
};

module.exports = {
  config,
  loadConfig
}