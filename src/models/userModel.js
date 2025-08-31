const baseModel = require("./baseModel");

const userModel = baseModel.createBaseModel("users", {
    allowedSortBy: ["id", "username", "createdAt", "isAdmin"],
    defaultSortBy: "createdAt"
});

module.exports = userModel;