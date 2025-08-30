const createBaseModel = require("./baseModel");
const db = require("../config/db");

const userModel = createBaseModel("users");

/**
 * Get a user by their username.
 * @param {string} username - The username of the user to retrieve. 
 * @returns The user object or null if not found.
 */
userModel.getByUsername = async (username) => {
    let conn;
    try {
        conn = await db.getConnection();
        const [user] = await conn.query(`SELECT * FROM users WHERE username = ?`, [username]);
        return user || null;
    } finally {
        if (conn) conn.release();
    }
};

module.exports = userModel;