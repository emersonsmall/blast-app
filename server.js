const express = require("express");
const JWT = require("./src/middleware/authMiddleware.js");
const path = require("path");
const authRoutes = require("./src/api/auth.js");
const jobRoutes = require("./src/api/jobs.js");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/jobs", jobRoutes);

const genbankApiUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2";

// Main page protected by authentication middleware
app.get("/", JWT.authenticateToken, (req, res) => {
   res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Admin page requires admin permissions
app.get("/admin", JWT.authenticateToken, (req, res) => {
   // user info added to the request by JWT.authenticateToken
   const user = users[req.user.username];
   
   if (!user || !user.admin) {
      // bad user or not admin
      console.log("Unauthorised user requested admin content.");
      return res.sendStatus(403);
   }

   // User permissions verified.
   res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(port, () => {
   console.log(`Server listening on port ${port}.`);
});
