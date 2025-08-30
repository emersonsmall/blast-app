const baseModel = require("./baseModel");
const db = require("../config/db");

const resultModel = baseModel.createBaseModel("job_results");

/**
 * Deletes a result by its associated job ID.
 * @param {number} jobId    The ID of the job.
 * @returns {boolean}       True if deleted, false otherwise.
 */
resultModel.deleteByJobId = async (jobId) => {
    const conn = await db.getConnection();
    try {
        const query = `
            DELETE FROM job_results
            WHERE id = (SELECT result_id FROM jobs WHERE id = ?)
        `;
        const result = await conn.query(query, [jobId]);
        return result.affectedRows > 0;
    } finally {
        if (conn) conn.release();
    }
};

module.exports = resultModel;
