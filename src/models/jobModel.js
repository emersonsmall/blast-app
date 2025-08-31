const baseModel = require("./baseModel");

const jobModel = baseModel.createBaseModel("jobs", {
    allowedSortBy: ["id", "status", "createdAt", "queryTaxon", "targetTaxon"],
    defaultSortBy: "createdAt"
});

module.exports = jobModel;