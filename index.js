// index.js
const express = require("express");
const webhookRoutes = require("./routes/webhooks"); // Import webhook routes
const authRoute = require("./routes/auth");
const app = express();
app.use(express.json());

// Use webhook routes
app.use("/api/ghl-contacts", webhookRoutes);
app.use("/api/login", authRoute);
// Default route
app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
