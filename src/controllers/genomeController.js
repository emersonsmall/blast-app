const genomeModel = require("../models/genomeModel");

/**
 * @route GET /api/v1/genomes
 * @desc Get all genomes in the database
 * @access Private (Admin)
 */
exports.getAllGenomes = async (req, res) => {
    try {
        const authenticatedUser = req.user;
        if (!authenticatedUser.isAdmin) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const { sortBy, sortOrder, page, limit, ...filters } = req.query;

        const queryOptions = {
            filters,
            pagination: { page, limit },
            sorting: { sortBy, sortOrder }
        };

        const result = await genomeModel.find(queryOptions);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching genomes:", err);
        res.status(500).json({ error: "Error fetching genomes" });
    }
};
