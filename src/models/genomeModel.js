const { createBaseModel, mapKeysToCamelCase, camelToSnakeCase } = require("./baseModel");
const db = require("../config/db");

const genomeModel = createBaseModel("genomes", {
    allowedSortBy: ["id", "commonName", "organismName", "totalSequenceLength", "totalGeneCount"],
    defaultSortBy: "organismName"
});

/**
 * Finds all unique genomes that a specific user has run jobs with.
 * @param {number} userId   The ID of the user.
 * @returns {object}        An object of records and pagination metadata.
 */
genomeModel.getUniqueGenomesByUserId = async (userId, queryOptions = {}) => {
    const { pagination = {}, sorting = {} } = queryOptions;

    // Main query for fetching records
    let query = `
        SELECT DISTINCT g.* FROM genomes g
        JOIN jobs j ON g.id = j.query_accession OR g.id = j.target_accession
        WHERE j.user_id = $1
    `;

    // Count query for pagination
    let countQuery = `
        SELECT COUNT(DISTINCT g.id) AS total FROM genomes g
        JOIN jobs j ON g.id = j.query_accession OR g.id = j.target_accession
        WHERE j.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2; // Start from $2 since $1 is taken by userId

    // Sorting
    const sortBy = sorting.sortBy || genomeModel.defaultSortBy;
    const sortOrder = sorting.sortOrder === "asc" ? "ASC" : "DESC";
    if (genomeModel.allowedSortBy.includes(sortBy)) {
        query += ` ORDER BY ${camelToSnakeCase(sortBy)} ${sortOrder}`;
    }

    // Pagination
    const limit = parseInt(pagination.limit, 10) || 10;
    const page = parseInt(pagination.page, 10) || 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    // Execute queries
    const genomeResult = await db.query(query, params);
    const countResult = await db.query(countQuery, [userId]);

    const total = parseInt(countResult.rows[0].total, 10);

    return {
        records: mapKeysToCamelCase(genomeResult.rows),
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
};

module.exports = genomeModel;