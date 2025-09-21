const { Pool } = require("pg");
const config = require("./index");

const pool = new Pool({
    host: config.db.host,
    port: config.db.port || 5432,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: { rejectUnauthorized: false } // For AWS RDS
});

module.exports = {
    async query(text, params) {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    },
    async getClient() {
        return await pool.connect();
    }
};
