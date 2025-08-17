const express = require("express");
const path = require("path");

const { authenticateToken, authoriseAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route GET /
 * @desc Serve the main page (index.html)
 * @access Private (user must be authenticated)
 */
router.get("/", authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', "public", "index.html"));
});

/**
 * @route GET /admin
 * @desc Serve the admin page (admin.html)
 * @access Private (user must be authenticated and an admin)
 */
router.get("/admin", [authenticateToken, authoriseAdmin], (req, res) => {
   res.sendFile(path.join(__dirname, '..', '..', "public", "admin.html"));
});

module.exports = router;