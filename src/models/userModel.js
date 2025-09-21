const { createBaseModel } = require("./baseModel");

const userModel = createBaseModel("users", {
    allowedSortBy: ["id", "username", "createdAt", "isAdmin"],
    defaultSortBy: "createdAt"
});

module.exports = userModel;