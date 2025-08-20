const jwt = require("jsonwebtoken");
const config = require("../config");

// Hard-coded username and password
const users = {
   user1: {
      id: 1,
      password: "user1",
      admin: false,
   },
   admin: {
      id: 2,
      password: "admin",
      admin: true,
   },
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = { id: user.id, username: username, admin: user.admin };

  console.log(`User ${username} logged in successfully.`);
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });

  res.json({ authToken: token });
};