const express = require("express");
const jwt = require("jsonwebtoken"); // Import JWT library
const moment = require("moment"); // Import moment for date formatting
const { decryptSSN } = require("../helpers"); // Import decryption helper
const db = require("../db"); // Import database connection
const router = express.Router();

// Login endpoint
router.post("/", async (req, res) => {
  const { lastName, dob, fourDigitSSN } = req.body;
  try {
    if (!lastName || !dob || !fourDigitSSN) {
      return res
        .status(400)
        .json({ message: "All fields are required", status: false });
    }

    // Validate the date format (MM-YYYY)
    if (!moment(dob, "MM-YYYY", true).isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format (MM-YYYY)", status: false });
    }

    // Parse the input date (MM-YYYY)
    const inputMonthYear = moment(dob, "MM-YYYY").format("MM-YYYY");

    // Query the database for contacts with the given last name
    const [contacts] = await db.query(
      "SELECT * FROM contacts WHERE lastName = ?",
      [lastName]
    );
    console.log(contacts, "contacts");
    // console.log(contact.hashedFour, "contact.hashedFour", decryptedSSN);
    // Check if any contacts were found
    if (!contacts.length) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", status: false });
    }

    // Find the contact with a matching date of birth (MM-YYYY)
    const contact = contacts.find((c) => {
      if (!c.dateOfBirth) {
        console.error("dateOfBirth is missing or invalid for contact:", c);
        return false;
      }

      try {
        const contactMonthYear = moment(c.dateOfBirth).format("MM-YYYY");
        return contactMonthYear === inputMonthYear;
      } catch (error) {
        console.error("Error parsing dateOfBirth for contact:", c, error);
        return false;
      }
    });

    // Check if a matching contact was found
    if (!contact) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", status: false });
    }

    // Check if the contact has a hashed SSN
    if (!contact.hashedFour) {
      return res.status(400).json({ message: "SSN not found", status: false });
    }
    console.log(
      decryptSSN(
        "7516ce0b555acdbe7af6825cc5e01e0c:ba325450:e966c276126fcbacf52b6b3c77551fe8"
      ),
      "-----"
    );
    // Decrypt the SSN and compare it with the input
    let decryptedSSN;
    try {
      decryptedSSN = decryptSSN(contact.hashedFour);
      console.log(contact.hashedFour, "contact.hashedFour", decryptedSSN);
    } catch (error) {
      console.error("Error decrypting SSN:", error);
      return res.status(500).json({ message: "Server error", status: false });
    }

    const lastFour = decryptedSSN;

    if (lastFour !== fourDigitSSN) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", status: false });
    }

    // Generate JWT token
    const token = jwt.sign(
      { contactId: contact.contact_id, email: contact.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    // Return success response
    res.status(200).json({
      message: "Login successful",
      token,
      contact_id: contact.contact_id,
      status: true,
    });
  } catch (error) {
    console.error("Server error:", error); // Log the error for debugging
    res.status(500).json({ message: "Server error", status: false });
  }
});

module.exports = router;
