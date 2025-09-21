const { createBaseModel } = require("./baseModel");
const db = require("../config/db");

const resultModel = createBaseModel("job_results", {
    allowedSortBy: ["id", "eValue", "score", "identityPercent"],
    defaultSortBy: "identityPercent"
});

/**
 * Deletes a result by its associated job ID.
 * @param {number} jobId    The ID of the job.
 * @returns {boolean}       True if deleted, false otherwise.
 */
resultModel.deleteByJobId = async (jobId) => {
    const query = `
        DELETE FROM job_results
        WHERE id = (
            SELECT result_id FROM jobs WHERE id = $1
        )
    `;
    const result = await db.query(query, [jobId]);
    return result.rowCount > 0;
};

module.exports = resultModel;
