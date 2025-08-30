const db = require("../config/db");

/**
 * Creates a generic model with basic CRUD and search operations for a specified table.
 * @param {string} tableName - The name of the database table.
 * @returns {object} An object containing basic CRUD and search methods.
 */
const createBaseModel = (tableName) => {
    return {
        /**
         * CREATE: Inserts a new record.
         * @param {object} data - An object containing the fields and values to insert.
         * @returns {object} The newly created record.
         */
        async create(data) {
            let conn;
            try {
                conn = await db.getConnection();
                const fields = Object.keys(data);
                const placeholders = fields.map(() => "?").join(", ");
                const query = `INSERT INTO ${tableName} (${fields.join(", ")}) VALUES (${placeholders})`;
                const result = await conn.query(query, Object.values(data));
                const [newRecord] = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [result.insertId]);
                return newRecord;
            } finally {
                if (conn) conn.release();
            }
        },

        /**
         * READ: Retrieves a record by its ID.
         * @param {number} id - The ID of the record to retrieve.
         * @returns {object|null} - The record or null if not found.
         */
        async getById(id) {
            let conn;
            try {
                conn = await db.getConnection();
                const [record] = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
                return record || null;
            } finally {
                if (conn) conn.release();
            }
        },

        /**
         * UPDATE: Updates a record by its ID.
         * @param {number} id - The ID of the record to update.
         * @param {object} updates - An object containing the fields to update.
         * @returns {object|null} - The updated record or null if not found.
         */
        async update(id, updates) {
            let conn;
            try {
                conn = await db.getConnection();
                const fields = Object.keys(updates);
                const setClause = fields.map(field => `${field} = ?`).join(", ");
                if (!setClause) return await this.getById(id); // No updates

                const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
                await conn.query(query, [...Object.values(updates), id]);
                return this.getById(id);
            } finally {
                if (conn) conn.release();
            }
        },

        /**
         * DELETE: Deletes a record by its ID.
         * @param {number} id - The ID of the record to delete.
         * @return {boolean} - True if deleted, false otherwise.
         */
        async delete(id) {
            let conn;
            try {
                conn = await db.getConnection();
                const result = await conn.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
                return result.affectedRows > 0;
            } finally {
                if (conn) conn.release();
            }
        },
    };
};

module.exports = createBaseModel;