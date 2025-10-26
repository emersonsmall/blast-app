// Defines routes for authentication

const express = require("express");
const router = express.Router();
const authController = require("../../../controllers/authController");

router.post("/register", authController.register);
router.post("/confirm", authController.confirm);
router.post("/login", authController.login);

module.exports = router;