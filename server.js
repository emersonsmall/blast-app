const config = require("./src/config");

const express = require("express");

const dbInit = require("./src/config/dbInit");

const authRoutes = require("./src/routes/api/v1/auth");
const jobRoutes = require("./src/routes/api/v1/jobs");
const userRoutes = require("./src/routes/api/v1/users");
const genomeRoutes = require("./src/routes/api/v1/genomes");

const app = express();

// Middleware
app.use(express.json());

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/genomes", genomeRoutes);

(async () => {
    await dbInit();

    app.listen(config.port, () => {
       console.log(`Server listening on port ${config.port}.`);
    });
})();

