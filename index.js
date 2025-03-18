// index.js
const express = require("express");
const webhookRoutes = require("./routes/webhooks"); // Import webhook routes
const authRoute = require("./routes/auth");
const userRoutes = require("./routes/users");
const app = express();
app.use(express.json());

// Use webhook routes
app.use("/api/ghl-contacts", webhookRoutes);
app.use("/api/login", authRoute);
app.use("/api/user_details", userRoutes);
app.use("/api/update_userDetails", userRoutes);
// Default route
app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
