const { createBaseModel } = require("./baseModel");

const jobModel = createBaseModel("jobs", {
    allowedSortBy: ["id", "status", "createdAt", "queryTaxon", "targetTaxon"],
    defaultSortBy: "createdAt"
});

module.exports = jobModel;