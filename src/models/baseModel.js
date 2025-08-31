const db = require("../config/db");

const camelToSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamelCase = (str) => str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));

/**
 * Converts object keys from snake_case to camelCase.
 * @param {object} obj  The object to convert.
 * @returns {object}    The converted object.
 */
const mapKeysToCamelCase = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    const newObj = {};

    for (const key in obj) {
        newObj[snakeToCamelCase(key)] = obj[key];
    }

    return newObj;
};

/**
 * Creates a generic model with basic CRUD and search operations for a specified table.
 * @param {string} tableName    The name of the database table.
 * @returns {object}            An object containing basic CRUD and search methods.
 */
const createBaseModel = (tableName, options = {}) => {
    const { allowedSortBy = ["id"], defaultSortBy = allowedSortBy[0] } = options;

    return {
        allowedSortBy,
        defaultSortBy,

        /**
         * CREATE: Inserts a new record.
         * @param {object} data     An object containing the fields and values to insert.
         * @returns {object}        The newly created record.
         */
        async create(data) {
            let conn;
            try {
                conn = await db.getConnection();

                const cols = Object.keys(data).map(camelToSnakeCase).join(", ");
                const placeholders = Object.keys(data).map(() => "?").join(", ");
                const vals = Object.values(data);

                const query = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`;
                const result = await conn.query(query, vals);

                const [newRecord] = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [result.insertId]);
                return mapKeysToCamelCase(newRecord);
            } finally {
                if (conn) conn.release();
            }
        },

        /**
         * READ: Retrieves a record by its ID.
         * @param {number} id       The ID of the record to retrieve.
         * @returns {object|null}   The record or null if not found.
         */
        async getById(id) {
            let conn;
            try {
                conn = await db.getConnection();
                const [record] = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
                return record ? mapKeysToCamelCase(record) : null;
            } finally {
                if (conn) conn.release();
            }
        },

        /**
         * UPDATE: Updates a record by its ID.
         * @param {number} id       The ID of the record to update.
         * @param {object} updates  An object containing the fields to update.
         * @returns {object|null}   The updated record or null if not found.
        */
       async updateById(id, updates) {
           let conn;
           try {
               conn = await db.getConnection();
               
               const setClause = Object.keys(updates)
               .map(key => `${camelToSnakeCase(key)} = ?`)
               .join(", ");
               
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
         * @param {number} id   The ID of the record to delete.
         * @return {boolean}    True if deleted, false otherwise.
        */
       async deleteById(id) {
           let conn;
           try {
               conn = await db.getConnection();
               const result = await conn.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
               return result.affectedRows > 0;
            } finally {
                if (conn) conn.release();
            }
        },

        /**
         * FIND method with filtering, sorting, and pagination.
         * @param {object} queryOptions     Contains filters, pagination, and sorting
         * @returns {object}                { records, totalItems, totalPages, currentPage }
         */
        async find(queryOptions = {}) {
            let conn;
            try {
                conn = await db.getConnection();
                const { filters = {}, pagination = {}, sorting = {} } = queryOptions;

                let query = `SELECT * FROM ${tableName}`;
                let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
                const params = [];

                // Filtering
                const filterKeys = Object.keys(filters);
                if (filterKeys.length > 0) {
                    const whereClauses = filterKeys.map(key => {
                        let val = filters[key];
                        if (typeof val === "string") {
                            if (val.toLowerCase() === "true") {
                                val = 1;
                            } else if (val.toLowerCase() === "false") {
                                val = 0;
                            }
                        }

                        params.push(val);
                        return `${camelToSnakeCase(key)} = ?`;
                    });
                    const whereString = ` WHERE ${whereClauses.join(" AND ")}`;
                    query += whereString;
                    countQuery += whereString;
                }

                // Sorting
                const sortBy = sorting.sortBy || defaultSortBy;
                const sortOrder = sorting.sortOrder === "asc" ? "ASC" : "DESC";
                if (allowedSortBy.includes(sortBy)) {
                    query += ` ORDER BY ${camelToSnakeCase(sortBy)} ${sortOrder}`;
                }

                // Pagination
                const limit = parseInt(pagination.limit, 10) || 10;
                const page = parseInt(pagination.page, 10) || 1;
                const offset = (page - 1) * limit;
                query += ` LIMIT ? OFFSET ?`;

                console.log("Executing query:", query, [...params, limit, offset]);
                console.log("Executing count query:", countQuery, params);
                const records = await conn.query(query, [...params, limit, offset]);
                const [countResult] = await conn.query(countQuery, params);
                const total = Number(countResult.total);

                return {
                    records: records,
                    totalItems: total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                };

            } finally {
                if (conn) conn.release();
            }
        },

        /**
         * READ ALL: Retrieves all records from the table.
         * @returns {array} An array of all records.
         */
        async getAll() {
            const { records } = await this.find({ pagination: { limit: 1000 } });
            return records;
        },
        
        /**
         * SEARCH: Searches records by a specified field and value.
         * @param {string} field    The field to search by.
         * @param {*} value         The value to search for.
         * @return {array}          An array of matching records.
         */
        async searchByField(field, value) {
            const { records } = await this.find({ filters: { [field]: value } });
            return records;
        },
    };
};

module.exports = {createBaseModel, mapKeysToCamelCase, camelToSnakeCase, snakeToCamelCase};