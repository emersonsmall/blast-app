const express = require("express");
const router = express.Router();
const jobController = require("../../../controllers/jobController");
const { authenticateToken } = require("../../../middleware/authMiddleware");

// All routes in this file require valid JWT
router.use(authenticateToken);

/**
 * @route POST /api/v1/jobs
 * @desc Create a new job
 * @access Private
 */
router.post("/", jobController.createJob);

/**
 * @route GET /api/v1/jobs
 * @desc Get all jobs for the authenticated user
 * @access Private
 */
router.get("/", jobController.getAllJobsForUser);

/**
 * @route GET /api/v1/jobs/:id
 * @desc Get a job by its ID
 * @access Private
 */
router.get("/:id", jobController.getJobById);

/**
 * @route DELETE /api/v1/jobs/:id
 * @desc Delete a job by its ID
 * @access Private
 */
router.delete("/:id", jobController.deleteJobById);

/**
 * @route   GET /api/v1/jobs/:id/result
 * @desc    Get the result of a job
 * @access  Private
 */
router.get("/:id/result", jobController.getJobResult);

module.exports = router;