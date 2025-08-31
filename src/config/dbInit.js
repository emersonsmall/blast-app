const db = require("./db");
const mariadb = require("mariadb");
const config = require("../config");
const { setTimeout } = require("timers/promises");

const createTableQueries = [
    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS genomes (
        id VARCHAR(50) PRIMARY KEY,
        common_name VARCHAR(255),
        organism_name VARCHAR(255) NOT NULL,
        total_sequence_length INT NOT NULL,
        total_gene_count INT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS job_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        query_id VARCHAR(255) NOT NULL,
        hit_title VARCHAR(255) NOT NULL,
        e_value DOUBLE NOT NULL,
        score FLOAT NOT NULL,
        identity_percent FLOAT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        query_taxon VARCHAR(255) NOT NULL,
        target_taxon VARCHAR(255) NOT NULL,
        query_accession VARCHAR(50),
        target_accession VARCHAR(50),
        status ENUM('pending', 'getting_genomes', 'running_blast', 'completed', 'failed') DEFAULT 'pending',
        result_id INT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (query_accession) REFERENCES genomes(id),
        FOREIGN KEY (target_accession) REFERENCES genomes(id),
        FOREIGN KEY (result_id) REFERENCES job_results(id)
    )`
];

const seedUserQueries = [
    `INSERT IGNORE INTO users (username, password, is_admin) VALUES ("admin", "admin", TRUE)`,
    `INSERT IGNORE INTO users (username, password, is_admin) VALUES ("user1", "user1", FALSE)`
];

const initDatabase = async () => {
    const maxRetries = 5;
    const retryDelay = 5000; // 5 seconds

    for (let i = 1; i <= maxRetries; i++) {
        let conn;
        try {
            conn = await db.getConnection();
            for (const query of createTableQueries) {
                await conn.query(query);
            }

            for (const query of seedUserQueries) {
                await conn.query(query);
            }

            console.log("Database init completed.");
            if (conn) conn.release();
            return;
        } catch (err) {
            if (conn) conn.release();

            // Only retry on connection-related errors
            if (err.code === 'ER_GET_CONNECTION_TIMEOUT' || err.code === 'ECONNREFUSED') {
                 console.error(`Connection attempt failed: ${err.message}`);
                 if (i < maxRetries - 1) {
                    console.log(`Retrying in ${retryDelay / 1000} seconds...`);
                    await setTimeout(retryDelay);
                 } else {
                    console.error("Failed to connect to the database after multiple retries.");
                    process.exit(1);
                 }
            } else {
                // For other errors (e.g., SQL syntax error), fail immediately
                console.error("Error setting up database:", err);
                process.exit(1);
            }
        }
    }
};

module.exports = initDatabase;