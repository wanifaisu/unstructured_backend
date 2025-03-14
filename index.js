const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const authRoutes=require('./src/routes/auth')
const webhookRoutes=require("./src/routes/webhook")

dotenv.config();
connectDB();
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes)
app.use('/api/ghl-contacts', webhookRoutes);

app.get("/", (req, res) => {
    res.send("Server is running!");
  });
  app.get("/posts", (req, res) => {
    res.send({name:"nm snmd "});
  });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});