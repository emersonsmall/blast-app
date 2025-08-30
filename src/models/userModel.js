const baseModel = require("./baseModel");

const userModel = baseModel.createBaseModel("users", {
    allowedSortBy: ["id", "username", "created_at"],
    defaultSortBy: "created_at"
});

module.exports = userModel;