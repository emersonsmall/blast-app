const baseModel = require("./baseModel");
const db = require("../config/db");

const genomeModel = baseModel.createBaseModel("genomes", {
    allowedSortBy: ["id", "commonName", "organismName", "totalSequenceLength", "totalGeneCount"],
    defaultSortBy: "id"
});

/**
 * Finds all unique genomes that a specific user has run jobs with.
 * @param {number} userId   The ID of the user.
 * @returns {Array}         An array of genome metadata objects.
 */
genomeModel.getUniqueGenomesByUserId = async (userId, queryOptions = {}) => {
    let conn;
    try {
        conn = await db.getConnection();
        const { pagination = {}, sorting = {} } = queryOptions;

        // query joins jobs and genomes tables to get unique genomes for the user
        let query = `
            SELECT DISTINCT g.* FROM genomes g
            JOIN jobs j ON g.id = j.query_accession OR g.id = j.target_accession
            WHERE j.user_id = ?
        `;
        const params = [userId];

        // Sorting
        const sortBy = sorting.sortBy || genomeModel.defaultSortBy;
        const sortOrder = sorting.sortOrder === "asc" ? "ASC" : "DESC";
        if (genomeModel.allowedSortBy.includes(sortBy)) {
            query += ` ORDER BY g.${baseModel.camelToSnakeCase(sortBy)} ${sortOrder}`;
        }

        // Pagination
        const limit = parseInt(pagination.limit, 10) || 10;
        const page = parseInt(pagination.page, 10) || 1;
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        // Separate count query to get total count for pagination metadata
        const countQuery = `
            SELECT COUNT(DISTINCT g.id) as total FROM genomes g
            JOIN jobs j ON g.id = j.query_accession OR g.id = j.target_accession
            WHERE j.user_id = ?
        `;
        const [countResult] = await conn.query(countQuery, [userId]);
        const total = Number(countResult.total);

        console.log("Executing query:", query, params);
        const genomes = await conn.query(query, params);
        return {
            records: genomes.map(g => baseModel.mapKeysToCamelCase(g)),
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    } finally {
        if (conn) conn.release();
    }
};

module.exports = genomeModel;