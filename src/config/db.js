const mariadb = require("mariadb");
const config = require("../config");

const pool = mariadb.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    connectionLimit: 5,
});

module.exports = {
    async getConnection() {
        return await pool.getConnection();
    }
};
