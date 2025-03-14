const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ContactSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    locationId: {
        type: String,
        required: true,
    },
    contactName: {
        type: String,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    companyName: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
    },
    dnd: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String,
    },
    source: {
        type: String,
    },
    assignedTo: {
        type: String,
    },
    city: {
        type: String,
    },
    state: {
        type: String,
    },
    postalCode: {
        type: String,
    },
    address1: {
        type: String,
    },
    dateAdded: {
        type: Date,
        default: Date.now,
    },
    dateUpdated: {
        type: Date,
    },
    dateOfBirth: {
        type: Date,
        required: true, // Ensure DOB is required for authentication
    },
    tags: {
        type: [String],
    },
    country: {
        type: String,
    },
    website: {
        type: String,
    },
    timezone: {
        type: String,
    },
    ssn: {
        type: String,
        required: true, // Ensure SSN is required for authentication
        unique: true,   // Ensure SSN is unique
    },
    customField: {
        type: mongoose.Schema.Types.Mixed, // For dynamic or nested fields
    },
});

// Hash the SSN before saving the contact
ContactSchema.pre('save', async function (next) {
    if (this.isModified('ssn')) {
        const salt = await bcrypt.genSalt(10);
        this.ssn = await bcrypt.hash(this.ssn, salt);
    }
    next();
});

// Method to compare SSN during authentication
ContactSchema.methods.compareSSN = async function (ssn) {
   
    return await bcrypt.compare(ssn, this.ssn);
};

module.exports = mongoose.model('Contact', ContactSchema);