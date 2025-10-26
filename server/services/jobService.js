const { config } = require("../../src/config");
const jobModel = require("../../src/models/jobModel");

const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: config.aws.region });

/**
 * Creates a job record in DB and sends a message to SQS.
 */
exports.createJob = async (queryTaxon, targetTaxon, userId) => {
    const newJob = await jobModel.create({ userId, queryTaxon, targetTaxon });

    const command = new SendMessageCommand({
        QueueUrl: config.aws.sqsQueueUrl,
        MessageBody: JSON.stringify({ jobId: newJob.id }),
    });

    await sqsClient.send(command);

    return newJob;
};
