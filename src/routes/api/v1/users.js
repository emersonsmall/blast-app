const express = require("express");
const router = express.Router();
const userController = require("../../../controllers/userController");
const genomeController = require("../../../controllers/genomeController");
const { authenticateToken, authoriseAdmin } = require("../../../middleware/authMiddleware");

/**
 * @route POST /api/v1/users
 * @desc Register a new user
 * @access Public
 */
router.post("/", userController.createUser);

/**
 * @route GET /api/v1/users/:id
 * @desc Get user by ID
 * @access Private
 */
router.get("/:id", authenticateToken, userController.getUserById);

/**
 * @route GET /api/v1/users
 * @desc Get all users
 * @access Private (admin only)
 */
router.get("/", authenticateToken, authoriseAdmin, userController.getAllUsers);

/**
 * @route PUT /api/v1/users/:id
 * @desc Update user by ID
 * @access Private
 */
router.put("/:id", authenticateToken, userController.updateUserById);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete user by ID
 * @access Private (admin only)
 */
router.delete("/:id", authenticateToken, authoriseAdmin, userController.deleteUserById);

/**
 * @route GET /api/v1/users/:id/genomes
 * @desc Get all unique genomes associated with a user
 * @access Private
 */
router.get("/:id/genomes", authenticateToken, genomeController.getAllGenomesForUser);

module.exports = router;