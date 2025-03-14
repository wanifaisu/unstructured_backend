const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const ContactSchema = new mongoose.Schema({
    contact_id: { type: String },
    locationId: { type: String },
    contactName: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    companyName: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    dnd: { type: Boolean, default: false },
    type: { type: String },
    source: { type: String },
    assignedTo: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    address1: { type: String },
    dateAdded: { type: Date, default: Date.now },
    dateUpdated: { type: Date },
    dateOfBirth: { type: Date },
    tags: { type: [String] },
    country: { type: String },
    website: { type: String },
    timezone: { type: String },
    ssn: { type: String }, // Fully hashed SSN
    hashedFour: { type: String }, // Hashed last 4 digits of SSN
    customField: { type: mongoose.Schema.Types.Mixed }, // Flexible field for dynamic data
});

// 🔐 Method to compare full SSN
ContactSchema.methods.compareSSN = async function (ssn) {
    return await bcrypt.compare(ssn, this.ssn);
};

// 🔐 Method to compare last 4 SSN digits
ContactSchema.methods.compareLastFour = async function (ssnLastFour) {
    return await bcrypt.compare(ssnLastFour, this.hashedFour);
};

module.exports = mongoose.model("Contact", ContactSchema);
