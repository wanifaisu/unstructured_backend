const express = require("express");
const axios = require("axios");
const router = express.Router();

// PDCflow API credentials
const PDCFLOW_API_KEY = process.env.PDC_API_KEY; // Your API Key
const PDCFLOW_API_URL = "https://api.pdcflow.com/v1/payments"; // Sandbox URL

// Endpoint to process payment
router.post("/", async (req, res) => {
  try {
    const { amount, cardNumber, expiryDate, cvv } = req.body;

    // Validate input
    if (!amount || !cardNumber || !expiryDate || !cvv) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Prepare payment request payload
    const paymentData = {
      amount: amount,
      card_number: cardNumber,
      expiry_date: expiryDate,
      cvv: cvv,
      // Add other required fields as per PDCflow's API documentation
    };
    console.log(PDCFLOW_API_KEY, "Sending request to PDCflow:", paymentData);
    // Make API request to PDCflow
    const response = await axios.post(PDCFLOW_API_URL, paymentData, {
      headers: {
        Authorization: `Bearer ${PDCFLOW_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // Handle response
    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: response.data,
    });
  } catch (error) {
    console.error(
      "❌ Error processing payment:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Payment processing failed",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
