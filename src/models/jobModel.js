const createBaseModel = require("./baseModel");

const jobModel = createBaseModel("jobs");

/**
 * Retrieves all jobs for a specific user.
 * @param {string} userId The user ID to filter jobs by. 
 * @returns The jobs belonging to the specified user.
 */
jobModel.getAllByUserId = async (userId) => {
    let conn;
    try {
        conn = await db.getConnection();
        const records = await conn.query(`SELECT * FROM jobs WHERE user_id = ?`, [userId]);
        return records;
    } finally {
        if (conn) conn.release();
    }
};

module.exports = jobModel;