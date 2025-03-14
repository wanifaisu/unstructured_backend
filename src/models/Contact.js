const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ContactSchema = new mongoose.Schema({
    contact_id: {
        type: String,
    },
    locationId: {
        type: String,
      
    },
    contactName: {
        type: String,
    },
    firstName: {
        type: String,
      
    },
    lastName: {
        type: String,
       
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
        
        unique: true,   // Ensure SSN is unique
    },
    hashedFour:{
        type: String,
        unique: true,  
    },
    customField: {
        type: mongoose.Schema.Types.Mixed, // For dynamic or nested fields
    },
});

ContactSchema.pre('save', async function (next) {
    if (this.isModified('ssn')) {
        const salt = await bcrypt.genSalt(10);
        
        // Hash the full SSN
        this.ssn = await bcrypt.hash(this.ssn, salt);

        // Extract last 4 digits
        const rawSSN = this.ssn.match(/\d{4}$/)?.[0]; // Extracts last 4 digits
        if (rawSSN) {
            this.hashedFour = await bcrypt.hash(rawSSN, salt);
        }
    }
    next();
});

// Method to compare full SSN
ContactSchema.methods.compareSSN = async function (ssn) {
    return await bcrypt.compare(ssn, this.ssn);
};

// Method to compare last 4 SSN digits
ContactSchema.methods.compareLastFour = async function (ssnLastFour) {
    return await bcrypt.compare(ssnLastFour, this.hashedFour);
};
module.exports = mongoose.model('Contact', ContactSchema);