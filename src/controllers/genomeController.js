const genomeModel = require("../models/genomeModel");

/**
 * @route GET /api/v1/genomes
 * @desc Get all genomes in the database
 * @access Private (Admin)
 */
exports.getAllGenomes = async (req, res) => {
    try {
        const genomes = await genomeModel.getAll();
        res.status(200).json(genomes);
    } catch (err) {
        console.error("Error fetching genomes:", err);
        res.status(500).json({ error: "Error fetching genomes" });
    }
};

/**
 * @route GET /api/v1/users/:id/genomes
 * @desc Get all unique genomes associated with a specific user
 * @access Private (Admin or the user themselves)
 */
exports.getAllGenomesForUser = async (req, res) => {
    try {
        const requestedUserId = parseInt(req.params.id);
        const authenticatedUser = req.user;

        // Allow access if the authenticated user is an admin or is requesting their own genomes
        if (!authenticatedUser.is_admin && authenticatedUser.id !== requestedUserId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const genomes = await genomeModel.getUniqueGenomesByUserId(requestedUserId);
        res.status(200).json(genomes);
    } catch (err) {
        console.error("Error fetching genomes:", err);
        res.status(500).json({ error: "Error fetching genomes" });
    }
};