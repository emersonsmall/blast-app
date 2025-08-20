const mariadb = require("mariadb");

const pool = mariadb.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "genomesdb",
    connectionLimit: 5,
});

(async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log("Database connection successful.");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS genomes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                accession_id VARCHAR(255) NOT NULL UNIQUE,
                common_name VARCHAR(255) NOT NULL,
                scientific_name VARCHAR(255) NOT NULL,
                num_genes INT NOT NULL,
                num_chromosomes INT NOT NULL,
                sequence_length INT NOT NULL,
                size_in_bytes INT NOT NULL,
            );
        `);
    } catch (err) {
        console.error("Database connection failed:", err.message);
    } finally {
        if (conn) {
            conn.release();
            console.log("Database connection released.");
        }
    }
})();

module.exports = pool;
