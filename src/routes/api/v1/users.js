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
 * @route GET /api/v1/users/:id
 * @desc Get user from Cognito by username 
 * @access Private (admin only)
 */
router.get("/:id", userController.getUserById);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete user from Cognito by username
 * @access Private (admin only)
 */
router.delete("/:id", userController.deleteUserById);

module.exports = router;