const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const ghlRoutes = require("./src/routes/ghlRoutes");
const authRoutes = require("./src/routes/auth");
const webhookRoutes = require("./src/routes/webhook");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Define API routes
app.get("/posts", (req, res) => {
  res.json({ name: "Faisal", dream: "dhjbmfsn" });
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

// 🚨 Do NOT use `app.listen(PORT)`, instead EXPORT the app
module.exports = app;
