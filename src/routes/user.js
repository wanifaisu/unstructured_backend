const express = require("express");
const Contact = require("../models/Contact");
const verifyToken = require("../middlewere/authMiddleware");

const router = express.Router();

// ✅ Get user details after login
router.get("/", verifyToken, async (req, res) => {
    try {
      console.log(req.body,"req.user.email")
        const user = await Contact.findOne({ contact_id: req.body.contact_id }).select("-ssn -hashedFour"); // Exclude sensitive fields
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
