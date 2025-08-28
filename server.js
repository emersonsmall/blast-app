const express = require("express");

const config = require("./src/config");
const dbInit = require("./src/config/dbInit");

const authRoutes = require("./src/routes/api/v1/auth");
const jobRoutes = require("./src/routes/api/v1/jobs");
const pageRoutes = require("./src/routes/pages");

const app = express();

// Middleware
app.use(express.json());

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/jobs", jobRoutes);

// Web page routes
app.use("/", pageRoutes);

(async () => {
    await dbInit();

    app.listen(config.port, () => {
       console.log(`Server listening on port ${config.port}.`);
    });
})();

