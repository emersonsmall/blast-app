const jwt = require("jsonwebtoken");
const config = require("../config");

// Middleware function to verify JWT
exports.authenticateToken = (req, res, next) => {
   const authHeader = req.headers["authorization"];
   const token = authHeader && authHeader.split(" ")[1];

   if (!token) {
      return res.sendStatus(401); // Unauthorized
   }

   jwt.verify(token, config.tokenSecret, (err, user) => {
      if (err) {
         return res.sendStatus(403); // Forbidden
      }
      req.user = user; // Attach user info to request
      next();
   });
};