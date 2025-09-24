// External modules
const { 
   CognitoJwtVerifier
} = require("aws-jwt-verify");

// Internal modules
const config = require("../config");


const verifier = CognitoJwtVerifier.create({
   userPoolId: config.aws.cognito.userPoolId,
   tokenUse: "id",
   clientId: config.aws.cognito.clientId,
});

// Authentication middleware to verify JWT
exports.authenticateToken = async (req, res, next) => {
   const authHeader = req.headers["authorization"];
   const token = authHeader && authHeader.split(" ")[1];

   if (!token) {
      return res.sendStatus(401); // Unauthorized
   }

   try {
      const payload = await verifier.verify(token);
      req.user = {
         id: payload.sub,
         username: payload["cognito:username"],
         isAdmin: payload["cognito:groups"]?.includes("Admins") || false
      };
      next();
   } catch (err) {
      console.error("Token verification failed:", err);
      return res.sendStatus(403); // Forbidden
   }
};


// Authorisation middleware to check admin permissions
exports.authoriseAdmin = (req, res, next) => {
   if (req.user && req.user.isAdmin) {
      next();
   } else {
      console.log(`Forbidden: User '${req.user.username}' attempted to access admin route.`);
      return res.sendStatus(403); // Forbidden
   }
};