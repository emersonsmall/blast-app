const genomeModel = require("../models/genomeModel");

/**
 * @route GET /api/v1/genomes
 * @desc Get all genomes in the database
 * @access Private (Admin for all, any authenticated user for their own)
 */
exports.getAllGenomes = async (req, res) => {
    try {
        const { userId } = req.query;
        const authenticatedUser = req.user;
        
        // If a userId is provided, ensure the requester is either admin or the user themselves
        if (userId && !authenticatedUser.isAdmin && authenticatedUser.id !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        // If no userId is provided, only admins can access all genomes
        if (!userId && !authenticatedUser.isAdmin) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const { sortBy, sortOrder, page, limit, ...filters } = req.query;

        const queryOptions = {
            filters,
            pagination: { page, limit },
            sorting: { sortBy, sortOrder }
        };

        let result;
        if (userId) {
            result = await genomeModel.getUniqueGenomesByUserId(userId, queryOptions);
        } else {
            result = await genomeModel.find(queryOptions);
        }
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching genomes:", err);
        res.status(500).json({ error: "Error fetching genomes" });
    }
};
