const express = require("express");
const Contact = require("../models/Contact"); // Import your Mongoose model
const bcrypt = require("bcrypt"); // Ensure bcrypt is required
const router = express.Router();

// Webhook endpoint for GHL
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    // 🚨 Ensure email is provided
    if (!data.email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // 🚨 Ignore empty `id` values to prevent duplicate key errors
    if (!data.id || data.id.trim() === "") {
      delete data.id;
    }

    // Hash SSN if provided
    let hashedSSN = "";
    if (data.ssn) {
      const salt = await bcrypt.genSalt(10);
      hashedSSN = await bcrypt.hash(data.ssn, salt);
    }

    // Prepare the contact object
    const contactData = {
      locationId: data.locationId || "",
      contactName: data.contactName || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      companyName: data.companyName || "",
      email: data.email,
      phone: data.phone || "",
      dnd: data.dnd || false,
      type: data.type || "",
      source: data.source || "",
      assignedTo: data.assignedTo || "",
      city: data.city || "",
      state: data.state || "",
      postalCode: data.postalCode || "",
      address1: data.address1 || "",
      dateAdded: data.dateAdded || new Date(),
      dateUpdated: new Date(),
      dateOfBirth: data.dateOfBirth || null,
      tags: data.tags || [],
      country: data.country || "",
      website: data.website || "",
      timezone: data.timezone || "",
      ssn: hashedSSN || "",
      customField: data.customField || {},
    };

    // 🔍 Check if contact exists by email
    let existingContact = await Contact.findOne({ email: data.email });

    if (existingContact) {
      // Update only the fields provided in the webhook payload
      await Contact.updateOne({ email: data.email }, { $set: contactData });
      console.log(`✅ Updated contact: ${data.email}`);
      return res.status(200).json({ success: true, message: "Contact updated successfully" });
    } else {
      // 🆕 Create a new contact
      const newContact = new Contact(contactData);
      await newContact.save();
      console.log(`✅ New contact added: ${data.email}`);
      return res.status(201).json({ success: true, message: "Contact created successfully" });
    }
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error });
  }
});

module.exports = router;
