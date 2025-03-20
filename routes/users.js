const express = require("express");
const verifyToken = require("../authMiddleware");
const { default: axios } = require("axios");
const bcrypt = require("bcrypt");
const moment = require("moment");
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

router.put("/", async (req, res) => {
  try {
    const {
      contact_id,
      firstName,
      lastName,
      email,
      phone,
      address1,
      city,
      state,
      country,
      postalCode,
      hashedFour,
    } = req.body;

    if (!contact_id) {
      return res
        .status(400)
        .json({ message: "Missing contact_id", status: false });
    }

    let encryptedHashedFour = null;
    if (hashedFour) {
      const salt = await bcrypt.genSalt(10);
      encryptedHashedFour = await bcrypt.hash(hashedFour.toString(), salt);
    }
    const updateFields = [
      firstName,
      lastName,
      email,
      phone,
      postalCode,
      address1,
      city,
      state,
      country,
      encryptedHashedFour,
      contact_id,
    ];

    // Update query
    const updateSql = `
      UPDATE contacts 
      SET firstName = ?, lastName = ?, email = ?, phone = ?, postalCode = ?, address1 = ?, city = ?, state = ?, country = ?, hashedFour = ?
      WHERE contact_id = ?;
    `;

    // Execute MySQL query
    const [result] = await mysql.query(updateSql, updateFields);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Update in GHL API
    const GHL_API_URL = `${process.env.GHL_URL}/${contact_id}`;
    try {
      const ghlResponse = await axios.put(
        GHL_API_URL,
        {
          firstName,
          lastName,
          email,
          phone,
          address1,
          city,
          state,
          country,
          postalCode,
        }, // Added state & country
        {
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({
        message: "User updated successfully",
        user: {
          contact_id,
          firstName,
          lastName,
          email,
          phone,
          address1,
          city,
          state, // Added state
          country, // Added country
          postalCode,
        },
        ghlResponse: ghlResponse.data,
        status: true,
      });
    } catch (ghlErr) {
      console.error("GHL API Error:", ghlErr.response?.data || ghlErr.message);
      return res.status(500).json({
        message: "GHL API error",
        error: ghlErr.response?.data || ghlErr.message,
        status: false,
      });
    }
  } catch (err) {
    console.error("Server Error:", err.message);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message, status: false });
  }
});

module.exports = router;
