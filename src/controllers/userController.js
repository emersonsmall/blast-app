const userModel = require("../models/userModel");

/**
 * @route POST /api/v1/users
 * @desc Creates a new user
 * @access Public
 */
exports.createUser = async (req, res) => {
    const { username, password, is_admin } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        // Check if user already exists
        const existingUser = await userModel.searchByField("username", username);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: "Username already taken." });
        }

        const newUser = await userModel.create({ username, password, is_admin });

        res.status(201).json({ id: newUser.id, username: newUser.username });
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).json({ error: "Failed to create user." });
    }
};

/**
 * @route GET /api/v1/users/:id
 * @desc Retrieves a user by ID
 * @access Private (admin only or the user themselves)
 */
exports.getUserById = async (req, res) => {
    try {
        const reqId = parseInt(req.params.id);
        const authenticatedUser = req.user;

        // Ensure the user exists and the requester is either admin or the user themselves
        if (authenticatedUser.id !== reqId && !authenticatedUser.is_admin) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const user = await userModel.getById(reqId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({ id: user.id, username: user.username, is_admin: user.is_admin });
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: "Failed to fetch user." });
    }
};

/**
 * @route GET /api/v1/users
 * @desc Retrieves all users
 * @access Private (admin only)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const authenticatedUser = req.user;
        if (!authenticatedUser.is_admin) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const { sortBy, sortOrder, page, limit, ...filters } = req.query;

        const queryOptions = {
            filters,
            pagination: { page, limit },
            sorting: { sortBy, sortOrder }
        };

        const result = await userModel.find(queryOptions);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users." });
    }
};

/**
 * @route PUT /api/v1/users/:id
 * @desc Updates a user
 * @access Private (admin only or the user themselves)
 */
exports.updateUserById = async (req, res) => {
    const { password } = req.body;
    const reqId = parseInt(req.params.id);
    const authenticatedUser = req.user;

    if (!password) {
        return res.status(400).json({ error: "Password is required for update." });
    }

    // Ensure the requester is either admin or the user themselves
    if (authenticatedUser.id !== reqId && !authenticatedUser.is_admin) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
        const updatedUser = await userModel.updateById(reqId, { password });
        res.status(200).json({ id: updatedUser.id, username: updatedUser.username });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Failed to update user." });
    }
};

/**
 * @route DELETE /api/v1/users/:id
 * @desc Deletes a user
 * @access Private (admin only)
 */
exports.deleteUserById = async (req, res) => {
    try {
        const success = await userModel.deleteById(parseInt(req.params.id));
        if (!success) {
            return res.status(404).json({ error: "User not found." });
        }
        res.status(204).send();
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ error: "Failed to delete user." });
    }
};
