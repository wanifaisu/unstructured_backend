const express = require("express");
const Contact = require("../models/Contact");
const verifyToken = require("../middlewere/authMiddleware");
const router = express.Router();
router.get("/", verifyToken, async (req, res) => {
  try {
    const { contact_id } = req.query;
    if (!contact_id) {
      return res
        .status(400)
        .json({ message: "Missing contact_id", status: false });
    }

    const user = await Contact.findOne({ contact_id }).select(
      "-ssn -hashedFour"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    res.json({ user: user, status: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Server error", error: err.message, status: false });
  }
});

module.exports = router;
