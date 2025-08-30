const baseModel = require("./baseModel");

const jobModel = baseModel.createBaseModel("jobs", {
    allowedSortBy: ["id", "status", "created_at", "query_taxon", "target_taxon"],
    defaultSortBy: "created_at"
});

module.exports = jobModel;