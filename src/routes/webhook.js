const express = require("express");
const Contact = require("../models/Contact"); // Import your Mongoose model
const bcrypt = require("bcrypt"); // Ensure bcrypt is required
const router = express.Router();

// Webhook endpoint for GHL
router.post("/", async (req, res) => {
    console.log("📥 Incoming Webhook Data:", JSON.stringify(req.body, null, 2));
  try {
    const contacts = Array.isArray(req.body) ? req.body : [req.body]; // Ensure array format

    for (let data of contacts) {
      console.log("📥 Incoming Webhook Data:", JSON.stringify(data, null, 2));
    
      const rawSSN = data["Social security Number"]; // Extract SSN
    
      // Hash SSN if provided
      let hashedSSN = "";
      let hashedFour=""
      if (rawSSN) {
        hashedSSN = await bcrypt.hash(rawSSN.toString(), salt); 
        const lastFourSSN = rawSSN.toString().slice(-4); // Get last 4 digits
        const salt = await bcrypt.genSalt(10);
        hashedFour=await bcrypt.hash(lastFourSSN, salt);
      }
    
      // Prepare contact object
      const contactData = {
        contact_id: data.contact_id || "",
        locationId: data.locationId || "",
        contactName: data.full_name || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        companyName: data.companyName || "",
        email: data.email,
        hashedFour:hashedFour||"",
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
        ssn: hashedSSN || "", // Store hashed SSN
        customField: data.customField || {},
      };
    
      try {
        // 🔍 Check if contact exists by email
        let existingContact = await Contact.findOne({ email: data.email });
    
        if (existingContact) {
          // Update existing contact
          await Contact.updateOne({ email: data.email }, { $set: contactData });
          console.log(`✅ Updated contact: ${data.email}`);
        } else {
          // Create new contact
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
