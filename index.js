const express = require("express");
const webhookRoutes = require("./routes/webhooks"); // Import webhook routes
const authRoute = require("./routes/auth");
const cors = require("cors");
require("dotenv").config();
const userRoutes = require("./routes/users");
const accountsRoutes = require("./routes/accounts");
const OffersRoute = require("./routes/offers");
const paymentRoute = require("./routes/payments");
const app = express();
app.use(express.json());

// Use webhook routes
const allowedOrigins = [
  "http://localhost:5174",
  "http://localhost:5173",
  // "http://unifistruct.structuredsettlement.agency",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use("/api/ghl-contacts", webhookRoutes);
app.use("/api/user_account", accountsRoutes);
app.use("/api/login", authRoute);
app.use("/api/user_details", userRoutes);
app.use("/api/update_userDetails", userRoutes);
app.use("/api/process-payment", paymentRoute);
app.use("/api/contact_offers", OffersRoute);

// Default route
app.get("/", async (req, res) => {
  res.send("Welcome to the API!");
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
