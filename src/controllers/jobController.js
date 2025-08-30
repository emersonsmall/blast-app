const jobService = require("../services/jobService");
const jobModel = require("../models/jobModel");
const resultModel = require("../models/resultModel");

/**
 * @route   POST /api/v1/jobs
 * @desc    Create a new BLAST job
 * @access  Private
 */
exports.createJob = async (req, res) => {
  const { queryTaxon, targetTaxon } = req.body;
  const userId = req.user.id; // from JWT middleware

  if (!queryTaxon || !targetTaxon) {
    return res.status(400).json({ error: "Both queryTaxon and targetTaxon are required." });
  }

  try {
    // No await, just create job and respond immediately
    jobService.createJob(queryTaxon, targetTaxon, userId);

    res.status(202).json({
      message: "Job accepted and is now pending.",
    });
  } catch (err) {
    console.error("Error creating job:", err);
    res.status(500).json({ error: "Failed to create job." });
  }
};

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get a job by its ID
 * @access  Private
 */
exports.getJobById = async (req, res) => {
  try {
    const job = await jobModel.getById(parseInt(req.params.id));

    // Ensure the job exists and belongs to the requesting user (unless admin)
    if (!job || (job.user_id !== req.user.id && !req.user.is_admin)) {
      return res.status(404).json({ error: "Job not found." });
    }

    res.status(200).json(job);
  } catch (err) {
    console.error("Error fetching job:", err);
    res.status(500).json({ error: "Failed to fetch job." });
  }
};

/**
 * @route   GET /api/v1/jobs
 * @desc    Get all jobs for the authenticated user
 * @access  Private
 */
exports.getAllJobsForUser = async (req, res) => {
  try {
    const jobs = await jobModel.searchByField("user_id", req.user.id);
    res.status(200).json(jobs);
  } catch (err) {
    console.error("Error fetching jobs:", err);
    res.status(500).json({ error: "Failed to fetch jobs." });
  }
};

/**
 * @route   DELETE /api/v1/jobs/:id
 * @desc    Delete a job by its ID
 * @access  Private
 */
exports.deleteJobById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const job = await jobModel.getById(id);

    // Ensure the job exists and belongs to the requesting user (unless admin)
    if (!job || (job.user_id !== req.user.id && !req.user.is_admin)) {
      return res.status(404).json({ error: "Job not found." });
    }

    await jobModel.delete(id);
    //TODO await resultModel.deleteByJobId(id); // Also delete associated results
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ error: "Failed to delete job." });
  }
};

/**
 * @route   GET /api/v1/jobs/:id/result
 * @desc    Get BLAST results for a specific job
 * @access  Private
 */
exports.getJobResult = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const job = await jobModel.getById(id);

    // Ensure the job exists and belongs to the requesting user (unless admin)
    if (!job || (job.user_id !== req.user.id && !req.user.is_admin)) {
      return res.status(404).json({ error: "Job not found." });
    }

    // Ensure the job is completed
    if (job.status !== "completed" || !job.result_id) {
      return res.status(400).json({ error: "Job is not completed yet." });
    }

    const result = await resultModel.getById(job.result_id);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching job result:", err);
    res.status(500).json({ error: "Failed to fetch job result." });
  }
};

