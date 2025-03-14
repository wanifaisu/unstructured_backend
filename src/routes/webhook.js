const express = require("express");
const Contact = require("../models/Contact"); // Mongoose model
const bcrypt = require("bcrypt"); // For hashing SSNs
const router = express.Router();

// Webhook endpoint for GHL
router.post("/", async (req, res) => {
    try {
        const contacts = Array.isArray(req.body) ? req.body : [req.body];
        for (let data of contacts) {
            const rawSSN = data["Social security Number"]; 
            let hashedSSN = "";
            let ssnLastFourHash = "";
           
            if (rawSSN) {
                const salt = await bcrypt.genSalt(10);
                hashedSSN = await bcrypt.hash(rawSSN.toString(), salt);
                const lastFourSSN = rawSSN.toString().slice(-4);
                ssnLastFourHash = await bcrypt.hash(lastFourSSN, salt);
            }
         
            const contactData = {
                contact_id: data.contact_id || "",
                locationId: data.locationId || "",
                contactName: data.full_name || "",
                firstName: data.first_name || "",
                lastName: data.last_name || "",
                companyName: data.companyName || "",
                email: data.email,
                ssn: hashedSSN || "", 
                hashedFour: ssnLastFourHash || "", 
                phone: data.phone || "",
                dnd: data.dnd || false,
                type: data.type || "",
                source: data.source || "",
                assignedTo: data.assignedTo || "",
                city: data.city || "",
                state: data.state || "",
                postalCode: data.postalCode || "",
                address1: data.address1 || "",
                dateAdded: data.date_created || new Date(),
                dateUpdated: new Date(),
                dateOfBirth: data.date_of_birth || null,
                tags: data.tags || [],
                country: data.country || "",
                website: data.website || "",
                timezone: data.timezone || "",
                customField: data.customField || {},
            };

            try {
               
                let existingContact = await Contact.findOne({ email: data.email });

                if (existingContact) {
                  
                    await Contact.updateOne({ email: data.email }, { $set: contactData });
                    console.log(`✅ Updated contact: ${data.email}`);
                } else {
                   
                    const newContact = new Contact(contactData);
                    await newContact.save();
                    console.log(`✅ New contact added: ${data.email}`);
                }
            } catch (error) {
                console.error("❌ Error processing webhook:", error);
            }
        }

        res.status(200).json({ success: true, message: "Webhook processed successfully" });

    } catch (error) {
        console.error("❌ Error processing webhook:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error });
    }
});

module.exports = router;
