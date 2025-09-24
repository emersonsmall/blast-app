const express = require("express");
const router = express.Router();

const userController = require("../../../controllers/userController");
const { authenticateToken, authoriseAdmin } = require("../../../middleware/authMiddleware");

router.use(authenticateToken, authoriseAdmin);

/**
 * @route GET /api/v1/users
 * @desc Get all users from Cognito
 * @access Private (admin only)
 */
router.get("/", userController.getAllUsers);

/**
 * @route GET /api/v1/users/:username
 * @desc Get user from Cognito by username 
 * @access Private (admin only)
 */
router.get("/:username", userController.getUserByUsername);

/**
 * @route DELETE /api/v1/users/:username
 * @desc Delete user from Cognito by username
 * @access Private (admin only)
 */
router.delete("/:username", userController.deleteUserByUsername);

/**
 * @route GET /api/v1/users/:username/genomes
 * @desc Get all unique genomes associated with a user
 * @access Private
 */
router.get("/:username/genomes", userController.getAllGenomesForUser);

module.exports = router;