const db = require("../config/db");

// TODO: 

/**
 * CREATE: Inserts a new job into the jobs table.
 * @param {object} jobData - Contains userId, queryTaxon, and targetTaxon.
 * @returns {object} The newly created job record.
 */
exports.create = async (jobData) => {
    let conn;
    try {
        conn = await db.getConnection();
        const query = "INSERT INTO jobs (user_id, query_taxon, target_taxon) VALUES (?, ?, ?)";
        const result = await conn.query(query, Object.values(jobData));

        const [job] = await conn.query("SELECT * FROM jobs WHERE id = ?", [result.insertId]);
        return job;
    } finally {
        if (conn) conn.release();
    }
};

/**
 * READ: Retrieves a job by its ID.
 * @param {number} id - The ID of the job to retrieve.
 * @returns {object|null} The job record or null if not found.
 */
exports.getById = async (id) => {
    let conn;
    try {
        conn = await db.getConnection();
        const [job] = await conn.query("SELECT * FROM jobs WHERE id = ?", [id]);
        return job || null;
    } finally {
        if (conn) conn.release();
    }
};

/**
 * UPDATE: Updates the given job.
 * @param {number} id - The ID of the job to update.
 * @param {object} updates - An object containing the fields to update.
 * @returns {object|null} The updated job record or null if not found.
 */
exports.updateById = async (id, updates) => {
    let conn;
    try {
        conn = await db.getConnection();
        
        const fields = Object.keys(updates);
        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = Object.values(updates);

        const query = `UPDATE jobs SET ${setClause} WHERE id = ?`;
        await conn.query(query, [...values, id]);

        const [job] = await conn.query("SELECT * FROM jobs WHERE id = ?", [id]);
        return job || null;
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE: Deletes a job by its ID.
 * @param {number} id - The ID of the job to delete.
 * @returns {boolean} True if the job was deleted, false otherwise.
 */
exports.deleteById = async (id) => {
    let conn;
    try {
        conn = await db.getConnection();
        const result = await conn.query("DELETE FROM jobs WHERE id = ?", [id]);
        return result.affectedRows > 0;
    } finally {
        if (conn) conn.release();
    }
};