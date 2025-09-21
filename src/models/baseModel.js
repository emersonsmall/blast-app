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

    if (Array.isArray(obj)) {
        return obj.map(item => mapKeysToCamelCase(item));
    }

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
            const cols = Object.keys(data).map(camelToSnakeCase);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
            const vals = Object.values(data);

            const query = `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`;
            const result = await db.query(query, vals);
            return mapKeysToCamelCase(result.rows[0]);
        },

        /**
         * READ: Retrieves a record by its ID.
         * @param {number} id       The ID of the record to retrieve.
         * @returns {object|null}   The record or null if not found.
         */
        async getById(id) {
            const query = `SELECT * FROM ${tableName} WHERE id = $1`;
            const result = await db.query(query, [id]);
            return result.rows.length ? mapKeysToCamelCase(result.rows[0]) : null;
        },

        /**
         * UPDATE: Updates a record by its ID.
         * @param {number} id       The ID of the record to update.
         * @param {object} updates  An object containing the fields to update.
         * @returns {object|null}   The updated record or null if not found.
        */
       async updateById(id, updates) {
           const updateEntries = Object.entries(updates);
           if (updateEntries.length === 0) return this.getById(id);

           const setClause = updateEntries.map(([key], i) => `${camelToSnakeCase(key)} = $${i + 2}`).join(", ");
           const vals = [id, ...updateEntries.map(([, val]) => val)]; 

           const query = `UPDATE ${tableName} SET ${setClause} WHERE id = $1 RETURNING *`;
           const result = await db.query(query, vals);
           return mapKeysToCamelCase(result.rows[0]);
        },
        
        /**
         * DELETE: Deletes a record by its ID.
         * @param {number} id   The ID of the record to delete.
         * @return {boolean}    True if deleted, false otherwise.
        */
       async deleteById(id) {
           const query = `DELETE FROM ${tableName} WHERE id = $1`;
           const result = await db.query(query, [id]);
           return result.rowCount > 0;
        },

        /**
         * Find method with filtering, sorting, and pagination.
         * @param {object} queryOptions     Contains filters, pagination, and sorting
         * @returns {object}                { records, totalItems, totalPages, currentPage }
         */
        async find(queryOptions = {}) {
            const { filters = {}, pagination = {}, sorting = {}} = queryOptions;
            const params = [];
            let paramIndex = 1;

            let query = `SELECT * FROM ${tableName}`;
            let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;

            // Filtering
            const filterKeys = Object.keys(filters);
            if (filterKeys.length > 0) {
                const whereClauses = filterKeys.map(key => {
                    let val = filters[key];
                    if (typeof val === 'string') {
                        if (val.toLowerCase() === 'true') val = true;
                        else if (val.toLowerCase() === 'false') val = false;
                    }
                    params.push(val);
                    return `${camelToSnakeCase(key)} = $${paramIndex++}`;
                });
                const whereStr = ` WHERE ${whereClauses.join(" AND ")}`;
                query += whereStr;
                countQuery += whereStr;
            }

            // Sorting
            const sortBy = sorting.sortBy || defaultSortBy;
            const sortOrder = sorting.sortOrder === 'asc' ? 'ASC' : 'DESC';
            if (allowedSortBy.includes(sortBy)) {
                query += ` ORDER BY ${camelToSnakeCase(sortBy)} ${sortOrder}`;
            }

            // Pagination
            const limit = parseInt(pagination.limit, 10) || 1000;
            const page = parseInt(pagination.page, 10) || 1;
            const offset = (page - 1) * limit;
            query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, offset);

            // Execute queries
            const recordsResult = await db.query(query, params);
            const countResult = await db.query(countQuery, params.slice(0, filterKeys.length));
            const total = parseInt(countResult.rows[0].total, 10);

            return {
                records: mapKeysToCamelCase(recordsResult.rows),
                totalItems: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        },

        /**
         * Retrieves all records from the table.
         * @returns {array} An array of all records.
         */
        async getAll() {
            const { records } = await this.find({ pagination: { limit: 1000 } });
            return records;
        },
        
        /**
         * Searches records by a specified field and value.
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

module.exports = {createBaseModel, mapKeysToCamelCase, camelToSnakeCase};