const express = require("express");
const router = express.Router();
const jobController = require("../../../controllers/jobController");
const { authenticateToken } = require("../../../middleware/authMiddleware");

// All routes in this file require valid JWT
router.use(authenticateToken);

router.post("/", jobController.createJob);

module.exports = router;