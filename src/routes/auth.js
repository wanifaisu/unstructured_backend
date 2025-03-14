const express = require('express');
const jwt = require('jsonwebtoken');
const Contact = require('../models/Contact');
const dotenv = require('dotenv');

dotenv.config();
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    const { lastName, dob, ssn } = req.body;

    try {
        // Find the contact by last name and DOB
        const contact = await Contact.findOne({ lastName, dateOfBirth: dob });
        if (!contact) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare the provided SSN with the hashed SSN
        const isMatch = await contact.compareSSN(ssn);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate a JWT token (optional)
        const token = jwt.sign({ contactId: contact._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;