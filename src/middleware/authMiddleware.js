const jwt = require("jsonwebtoken");
const config = require("../config");

// Authentication middleware to verify JWT
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


// Authorisation middleware to check admin permissions
exports.authoriseAdmin = (req, res, next) => {
   if (req.user && req.user.admin) {
      next();
   } else {
      console.log(`Forbidden: User '${req.user.username}' attempted to access admin route.`);
      return res.sendStatus(403); // Forbidden
   }
};