const express = require("express");
const verifyToken = require("../authMiddleware");
const { default: axios } = require("axios");
const mysql = require("../db");
const router = express.Router();

const GHL_API_KEY = process.env.GHL_API_KEY;
// GET: Fetch contact by contact_id
router.get("/:contact_id", async (req, res) => {
  try {
    const { contact_id } = req.params;
    console.log(`Fetching user with contact_id: ${contact_id}`);

    if (!contact_id) {
      return res
        .status(400)
        .json({ success: false, message: "Contact ID is required" });
    }

    // Check if the contact exists
    const [contact] = await mysql.query(
      "SELECT * FROM contacts WHERE contact_id = ?",
      [contact_id]
    );

    if (contact.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    console.log(contact[0], "contact[0]");
    res.status(200).json({ success: true, data: contact[0] });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// PUT: Update contact
// UPDATE User Route
router.put("/", verifyToken, async (req, res) => {
  try {
    const { contact_id, firstName, lastName, email, phone } = req.body;

    if (!contact_id) {
      return res
        .status(400)
        .json({ message: "Missing contact_id", status: false });
    }

    // ✅ Update User in MySQL
    const updateSql = `UPDATE contacts SET firstName = ?, lastName = ?, email = ?, phone = ? WHERE contact_id = ?`;

    const [result] = await mysql.query(updateSql, [
      firstName,
      lastName,
      email,
      phone,
      contact_id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // ✅ Update User in GHL API
    const GHL_API_URL = `https://rest.gohighlevel.com/v1/contacts/${contact_id}`;

    try {
      const ghlResponse = await axios.put(
        GHL_API_URL,
        { firstName, lastName, email, phone },
        {
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`, // Ensure GHL API key is in .env
            "Content-Type": "application/json",
          },
        }
      );

      res.json({
        message: "User updated successfully",
        user: { contact_id, firstName, lastName, email, phone },
        ghlResponse: ghlResponse.data,
        status: true,
      });
    } catch (ghlErr) {
      console.error("GHL API Error:", ghlErr.response?.data || ghlErr.message);
      res.status(500).json({
        message: "GHL API error",
        error: ghlErr.message,
        status: false,
      });
    }
  } catch (err) {
    console.error("Server Error:", err);
    res
      .status(500)
      .json({ message: "Server error", error: err.message, status: false });
  }
});

module.exports = router;
