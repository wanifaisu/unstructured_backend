const express = require("express");
const router = express.Router();

// Sample user data
router.get("/", (req, res) => {
  res.json({
    message: "User API is working!",
    users: [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Doe", email: "jane@example.com" }
    ]
  });
});

module.exports = router;
