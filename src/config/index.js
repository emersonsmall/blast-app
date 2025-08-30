require("dotenv").config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables.");
}

module.exports = {
  port: process.env.PORT || 3000,

  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "blast_app_db"
  },

  jwtSecret: process.env.JWT_SECRET,

  genbankApiKey: process.env.GENBANK_API_KEY
}