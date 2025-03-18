const express = require("express");
const { decryptSSN } = require("../helpers");
const db = require("../db");
const router = express.Router();
router.post("/", async (req, res) => {
  const { lastName, dob, fourDigitSSN } = req.body;

  try {
    if (!lastName || !dob || !fourDigitSSN) {
      return res
        .status(400)
        .json({ message: "All fields are required", status: false });
    }

    const inputMonthYear = moment(dob, "YYYY-MM-DD").format("MM-YYYY");

    // Fetch contacts with the given last name
    const [contacts] = await db.query(
      "SELECT * FROM contacts WHERE lastName = ?",
      [lastName]
    );

    if (!contacts.length) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", status: false });
    }

    // Find a contact with matching date of birth (month and year)
    const contact = contacts.find((c) => {
      if (!c.dateOfBirth) return false;
      const contactMonthYear = moment(c.dateOfBirth).format("MM-YYYY");
      return contactMonthYear === inputMonthYear;
    });

    if (!contact) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", status: false });
    }

    if (!contact.hashedFour) {
      return res.status(400).json({ message: "SSN not found", status: false });
    }

    // Decrypt and compare last 4 digits
    const decryptedSSN = decryptSSN(contact.hashedFour);
    const lastFour = decryptedSSN.slice(-4);

    if (lastFour !== fourDigitSSN) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", status: false });
    }

    // Generate JWT token
    const token = jwt.sign(
      { contactId: contact.id, email: contact.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      contact_id: contact.contact_id,
      status: true,
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: "Server error", status: false });
  }
});
module.exports = router;
