const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const userRoutes = require('./src/routes/user');
const ghlRoutes = require('./src/routes/ghlRoutes');
const authRoutes=require('./src/routes/auth')
const webhookRoutes=require("./src/routes/webhook")
const cron = require('node-cron'); // Add this line
const { fetchContactsFromGHL } = require('./src/controllers/ghlController'); // Add this line

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/ghl', ghlRoutes);
app.use('/api/auth', authRoutes)
app.use('/api/ghl-contacts', webhookRoutes);

app.get("/", (req, res) => {
    res.send("Server is running!");
  });
  app.get("/posts", (req, res) => {
    res.send({name:"nm snmd "});
  });
const PORT = process.env.PORT || 5000;

// // Schedule the script to run every hour
// cron.schedule('0 * * * *', () => {
//     console.log('Fetching contacts from Go High Level...');
//     fetchContactsFromGHL();
// });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});