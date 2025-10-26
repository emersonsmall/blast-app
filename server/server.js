const { loadConfig, config } = require("../src/config");
const { dbInit } = require("../src/config/db");

const express = require("express");

const app = express();

const startServer = async () => {
    try {
        await loadConfig();
        await dbInit();

        // Middleware
        app.use(express.json());

        // API routes
        const authRoutes = require("./routes/api/v1/auth");
        const jobRoutes = require("./routes/api/v1/jobs");
        const userRoutes = require("./routes/api/v1/users");
        const genomeRoutes = require("./routes/api/v1/genomes");
        app.use("/api/v1/auth", authRoutes);
        app.use("/api/v1/jobs", jobRoutes);
        app.use("/api/v1/users", userRoutes);
        app.use("/api/v1/genomes", genomeRoutes);

        app.listen(config.port, () => {
            console.log(`Server listening on port ${config.port}.`);
        });

    } catch (err) {
        console.error("FATAL: Failed to load configuration from AWS", err);
        process.exit(1);
    }
}
startServer();
