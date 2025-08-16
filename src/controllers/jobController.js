
const jobs = []; // TODO: replace with job DB

exports.createJob = async (req, res) => {
  const { speciesName, processingType } = req.body;
  const userId = req.user.id; // user ID from JWT middleware

  const newJob = {
    id: jobs.length + 1,
    userId,
    speciesName,
    processingType,
    status: "pending",
    createdAt: new Date(),
  };

  jobs.push(newJob);

  res.status(202).json({
    id: newJob.id,
    status: newJob.status,
    message: "Job accepted and is now pending.",
  });

  try {
    // fetch data from GenBank API
    console.log("Fetching data for job:", newJob.id);

    // process job using bioinformatics library

    // update job status to completed

  } catch (err) {
    console.error(`Job ${newJob.id} failed`, err);
    newJob.status = "failed";
    res.status(500).json({
      id: newJob.id,
      status: newJob.status,
      message: "Job processing failed.",
    });
  }

};

