const createBaseModel = require("./baseModel");
const db = require("../config/db");

const userModel = createBaseModel("users");

module.exports = userModel;