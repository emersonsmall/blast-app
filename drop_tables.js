const { Pool } = require('pg');
const { loadConfig, config } = require('./src/config');

const dropTables = async () => {
    const pool = new Pool({
        host: config.db.host,
        port: config.db.port || 5432,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    try {
        console.log('Connecting to the database...');
        await client.query('BEGIN');

        console.log('Dropping table: jobs');
        await client.query('DROP TABLE IF EXISTS jobs CASCADE;');

        console.log('Dropping table: job_results');
        await client.query('DROP TABLE IF EXISTS job_results CASCADE;');
        
        console.log('Dropping table: genomes');
        await client.query('DROP TABLE IF EXISTS genomes CASCADE;');

        console.log('Dropping type: job_status');
        await client.query('DROP TYPE IF EXISTS job_status;');
        
        await client.query('COMMIT');
        console.log('\nAll specified tables and types have been successfully dropped.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nError dropping tables:', err);
    } finally {
        client.release();
        pool.end();
        console.log('Database connection closed.');
    }
};

async function main() {
    await loadConfig();
    await dropTables();
}

main().catch(console.error);
