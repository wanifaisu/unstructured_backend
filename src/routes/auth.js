const express = require('express');
const jwt = require('jsonwebtoken');
const Contact = require('../models/Contact');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();
const router = express.Router();

// Login endpoint
router.post('/', async (req, res) => {
    const { lastName, dob, fourDigitSSN } = req.body;
    console.log(req.body, " req.body");

    try {
        if (!lastName || !dob || !fourDigitSSN) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const inputMonthYear = moment(dob, 'YYYY-MM-DD').format('MM-YYYY');
        const contacts = await Contact.find({ lastName });

        if (!contacts.length) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const contact = contacts.find((c) => {
            if (!c.dateOfBirth) return false;
            const contactMonthYear = moment(c.dateOfBirth).format('MM-YYYY');
            return contactMonthYear === inputMonthYear;
        });

        if (!contact) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!contact.hashedFour) {
            return res.status(400).json({ message: 'SSN not found' });
        }

        const isMatch = await contact.compareLastFour(fourDigitSSN);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token including contactId and email
        const token = jwt.sign(
            { contactId: contact._id, email: contact.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            contact_id: contact.contact_id,  // ✅ Include email in response
        });

    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
