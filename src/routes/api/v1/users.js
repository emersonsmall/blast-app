const express = require("express");
const router = express.Router();

const userController = require("../../../controllers/userController");
const { authenticateToken, authoriseAdmin } = require("../../../middleware/authMiddleware");

router.use(authenticateToken);

/**
 * @route GET /api/v1/users
 * @desc Get all users from Cognito
 * @access Private (admin only)
 */
router.get("/", authoriseAdmin, userController.getAllUsers);

/**
 * @route GET /api/v1/users/:id
 * @desc Get user from Cognito by username 
 * @access Private
 */
router.get("/:id", userController.getUserById);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete user from Cognito by username
 * @access Private (admin only)
 */
router.delete("/:id", authoriseAdmin, userController.deleteUserById);

module.exports = router;