const baseModel = require("./baseModel");
const db = require("../config/db");

const genomeModel = baseModel.createBaseModel("genomes");

/**
 * Finds all unique genomes that a specific user has run jobs with.
 * @param {number} userId   The ID of the user.
 * @returns {Array}         An array of genome metadata objects.
 */
genomeModel.getUniqueGenomesByUserId = async (userId) => {
    let conn;
    try {
        conn = await db.getConnection();
        // query joins jobs and genomes tables to get unique genomes for the user
        const query = `
            SELECT DISTINCT g.* FROM genomes g
            JOIN jobs j ON g.id = j.query_accession OR g.id = j.target_accession
            WHERE j.user_id = ?
        `;
        const genomes = await conn.query(query, [userId]);
        return genomes.map(g => baseModel.mapKeysToCamelCase(g));
    } finally {
        if (conn) conn.release();
    }
};

module.exports = genomeModel;