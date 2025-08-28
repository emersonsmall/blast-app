const db = require("../config/db");

/**
 * CREATE: Inserts a new result into the job_results table.
 * @param {object} resultData - Contains queryId, hitTitle, eValue, score, identityPercent.
 * @returns {object} The newly created result record.
 */
exports.create = async (resultData) => {
    let conn;
    try {
        conn = await db.getConnection();
        const query = `
            INSERT INTO job_results (query_id, hit_title, e_value, score, identity_percent)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await conn.query(query, Object.values(resultData));

        const [newResult] = await conn.query("SELECT * FROM job_results WHERE id = ?", [result.insertId]);
        return newResult;
    } finally {
        if (conn) conn.release();
    }
};

/**
 * READ: Retrieves a result by its ID.
 * @param {number} id - The ID of the result to retrieve.
 * @returns {object|null} The result record or null if not found.
 */
exports.getById = async (id) => {
    let conn;
    try {
        conn = await db.getConnection();
        const [result] = await conn.query("SELECT * FROM job_results WHERE id = ?", [id]);
        return result || null;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * UPDATE: Updates the given fields of a result by its ID.
 * @param {number} id - The ID of the result to update.
 * @param {object} updates - An object containing the fields to update.
 * @returns {object|null} The updated result record or null if not found.
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

        const [updatedResult] = await conn.query("SELECT * FROM job_results WHERE id = ?", [id]);
        return updatedResult || null;
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE: Deletes a result by its ID.
 * @param {number} id - The ID of the result to delete.
 * @returns {boolean} True if deletion was successful, false otherwise.
 */
exports.deleteById = async (id) => {
    let conn;
    try {
        conn = await db.getConnection();
        const result = await conn.query("DELETE FROM job_results WHERE id = ?", [id]);
        return result.affectedRows > 0;
    } finally {
        if (conn) conn.release();
    }
};
