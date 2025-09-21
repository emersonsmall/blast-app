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
    if (!job || (job.userId !== req.user.id && !req.user.isAdmin)) {
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
    const { sortBy, sortOrder, page, limit, ...filters } = req.query;

    const queryOptions = {
        filters,
        pagination: { page, limit },
        sorting: { sortBy, sortOrder }
    };
    
    if (!req.user.isAdmin) {
      // non-admins can only see their own jobs
      queryOptions.filters.userId = req.user.id;
    }

    const result = await jobModel.find(queryOptions);
    res.status(200).json(result);
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
    if (!job || (job.userId !== req.user.id && !req.user.isAdmin)) {
      return res.status(404).json({ error: "Job not found." });
    }

    await jobModel.deleteById(id);
    await resultModel.deleteByJobId(id); // delete associated results
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
    if (!job || (job.userId !== req.user.id && !req.user.isAdmin)) {
      return res.status(404).json({ error: "Job not found." });
    }

    // Ensure the job is completed
    if (job.status !== "completed" || !job.resultId) {
      return res.status(400).json({ error: "Job is not completed yet." });
    }

    const result = await resultModel.getById(job.resultId);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching job result:", err);
    res.status(500).json({ error: "Failed to fetch job result." });
  }
};

