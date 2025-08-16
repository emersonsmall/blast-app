require("dotenv").config();

const tokenSecret = require("crypto").randomBytes(64).toString("hex");

module.exports = {
  port: process.env.PORT || 3000,
  tokenSecret: process.env.JWT_SECRET || tokenSecret
}