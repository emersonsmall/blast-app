const jobService = require("../services/jobService");

exports.createJob = async (req, res) => {
  const { queryTaxon, targetTaxon } = req.body;
  const userId = req.user.id; // user ID from JWT middleware

  if (!queryTaxon || !targetTaxon) {
    return res.status(400).json({ error: "Both queryTaxon and targetTaxon are required." });
  }

  // No await, just create job and respond immediately
  const newJob = jobService.createJob(queryTaxon, targetTaxon, userId);

  console.log(JSON.stringify(newJob));

  res.status(202).json({
    id: newJob.id,
    status: newJob.status,
    message: "Job accepted and is now pending.",
  });
};
