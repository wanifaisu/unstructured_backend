
const express = require('express');
const Contact = require('../models/Contact'); // Import your Mongoose model
const router = express.Router();

// Webhook endpoint for GHL
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        // Validate required fields
        if (!data.email || !data.lastName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Extract last 4 digits of SSN
        const ssnLast4 = data?.ssn?.slice(-4);

        // Check if contact already exists
        let contact = await Contact.findOne({ email: data.email });

        if (contact) {
            // Update the existing contact
            contact.locationId = data.locationId || contact.locationId;
            contact.firstName = data.firstName || contact.firstName;
            contact.lastName = data.lastName || contact.lastName;
            contact.phone = data.phone || contact.phone;
            contact.dateOfBirth = new Date(data.dateOfBirth) || contact.dateOfBirth;
            contact.ssn = data.ssn; // Assuming SSN is stored securely
            contact.ssnLast4 = ssnLast4;
            contact.city = data.city || contact.city;
            contact.state = data.state || contact.state;
            contact.postalCode = data.postalCode || contact.postalCode;
            contact.address1 = data.address1 || contact.address1;
            contact.country = data.country || contact.country;
            contact.companyName = data.companyName || contact.companyName;
            contact.tags = data.tags || contact.tags;
            contact.website = data.website || contact.website;
            contact.dateUpdated = new Date();

            await contact.save();
        
        } else {
            // Create a new contact
            contact = new Contact({
                locationId: data.locationId || '',
                firstName: data.firstName || '',
                lastName: data.lastName,
                email: data.email,
                phone: data.phone || '',
                dateOfBirth: new Date(data.dateOfBirth),
                ssn: data.ssn,
                ssnLast4: ssnLast4,
                city: data.city || '',
                state: data.state || '',
                postalCode: data.postalCode || '',
                address1: data.address1 || '',
                country: data.country || '',
                companyName: data.companyName || '',
                tags: data.tags || [],
                website: data.website || '',
                dateAdded: new Date(),
                dateUpdated: new Date(),
            });

            await contact.save();
            console.log(`✅ Contact ${data.email} saved.`);
        }

        res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
        console.error('❌ Webhook processing error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
