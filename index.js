const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const authRoutes=require('./src/routes/auth')
const webhookRoutes=require("./src/routes/webhook")
const userRoutes=require("./src/routes/user")
const cors = require("cors");

dotenv.config();
connectDB();
const app = express();
// ✅ Enable CORS for Frontend (Replace with your frontend URL)
app.use(cors({
    origin: "http://localhost:5173",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true // If using cookies
}));

// ✅ Handle Preflight Requests (OPTIONS)
app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    res.sendStatus(200);
});

app.use(express.json());
app.use('/api/user_details', userRoutes);
app.use('/api/auth', authRoutes)
app.use('/api/ghl-contacts', webhookRoutes);
app.get("/", (req, res) => {
    res.send("Server is running!");
  });
  app.get("/posts", (req, res) => {
    res.send({name:"nm snmd "});
  });
app.post("/api/auth", (req, res) => {
    res.json({ message: "Auth successful" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
