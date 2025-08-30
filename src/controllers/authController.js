const jwt = require("jsonwebtoken");
const config = require("../config");
const userModel = require("../models/userModel");

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await userModel.getByUsername(username);

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = { id: user.id, username: username, is_admin: user.is_admin };

  console.log(`User '${username}' logged in successfully.`);
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });

  res.json({ authToken: token });
};