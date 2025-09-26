const { config } = require("./index");
const { Pool } = require("pg");
const { setTimeout } = require("timers/promises");

let pool;

/**
 * Initialises and returns the singleton Pool instance.
 * @returns {Pool} The PostgreSQL Pool instance. 
 */
const getPool = () => {
    if (!pool) {
        console.log("Creating DB connection pool...");
        pool = new Pool({
            host: config.db.host,
            port: config.db.port || 5432,
            user: config.db.user,
            password: config.db.password,
            database: config.db.name,
            ssl: { rejectUnauthorized: false } // For AWS RDS
        });
    }
    return pool;
};

const createJobStatusType = `
    DO $$ BEGIN
        CREATE TYPE job_status AS ENUM ('pending', 'getting_genomes', 'running_blast', 'completed', 'failed');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
`;

const createTableQueries = [
    `CREATE TABLE IF NOT EXISTS genomes (
        id VARCHAR(50) PRIMARY KEY,
        common_name VARCHAR(255),
        organism_name VARCHAR(255) NOT NULL,
        total_sequence_length INT NOT NULL,
        total_gene_count INT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS job_results (
        id SERIAL PRIMARY KEY,
        query_id VARCHAR(255) NOT NULL,
        hit_title VARCHAR(255) NOT NULL,
        e_value DOUBLE PRECISION NOT NULL,
        score REAL NOT NULL,
        identity_percent REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        query_taxon VARCHAR(255) NOT NULL,
        target_taxon VARCHAR(255) NOT NULL,
        query_accession VARCHAR(50),
        target_accession VARCHAR(50),
        status job_status DEFAULT 'pending',
        result_id INT UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (query_accession) REFERENCES genomes(id) ON DELETE SET NULL,
        FOREIGN KEY (target_accession) REFERENCES genomes(id) ON DELETE SET NULL,
        FOREIGN KEY (result_id) REFERENCES job_results(id) ON DELETE SET NULL
    )`
];

/**
 * Initialises the database schema if not already present.
 */
const dbInit = async () => {
    const currPool = getPool();
    const maxRetries = 5;
    const retryDelay = 5000; // 5 seconds
    
    for (let i = 1; i <= maxRetries; i++) {
        let client;
        try {
            client = await currPool.connect();
            console.log("Connected to PostgreSQL database");
            
            await client.query(createJobStatusType);
            
            for (const query of createTableQueries) {
                await client.query(query);
            }
            
            console.log("Database initialised successfully");
            if (client) client.release();
            return;
        } catch (err) {
            if (client) client.release();
            
            console.error(`Database connection attempt ${i} failed:`, err.message);
            if (i < maxRetries) {
                console.log(`Retrying in ${retryDelay / 1000} seconds...`);
                await setTimeout(retryDelay);
            } else {
                console.error("Max retries reached. Could not connect to the database.");
                process.exit(1);
            }
        }
    }
};

module.exports = {
    /**
     * Executes a query using the connection pool.
     */
    async query(text, params) {
        if (!pool) {
            throw new Error("Database not initialised. Call dbInit() first.");
        }
        return await pool.query(text, params);
    },
    dbInit
};
