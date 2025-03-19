const express = require("express");
const db = require("../db"); // Import MySQL connection
const router = express.Router();

// GET API to fetch accounts by contact_id
router.get("/accounts/:contact_id", async (req, res) => {
  try {
    const { contact_id } = req.params; // Extract contact_id from URL parameters

    // Validate contact_id
    if (!contact_id) {
      return res.status(400).json({
        success: false,
        message: "Contact ID is required",
      });
    }

    // Query the database to fetch accounts by contact_id
    const [accounts] = await db.query(
      "SELECT * FROM accounts WHERE contact_id = ?",
      [contact_id]
    );

    // Check if accounts were found
    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No accounts found for the provided contact ID",
      });
    }

    // Return the accounts array
    res.status(200).json({
      success: true,
      message: "Accounts fetched successfully",
      data: accounts,
    });
  } catch (error) {
    console.error("❌ Error fetching accounts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
