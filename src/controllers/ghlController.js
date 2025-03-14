const axios = require('axios');
const dotenv = require('dotenv');
const Contact = require('../models/Contact');

dotenv.config();

const GHL_API_KEY = process.env.GHL_API_KEY;

// Fetch custom field metadata from GHL
const fetchCustomFields = async () => {
    try {
        const response = await axios.get('https://rest.gohighlevel.com/v1/custom-fields', {
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
            },
        });

        // Create a mapping of custom field names to IDs
        const customFieldsMap = {};
        response.data.customFields.forEach(field => {
            customFieldsMap[field.name] = field.id;
        });

        return customFieldsMap;
    } catch (error) {
        console.error('Error fetching custom fields:', error.message);
        return {};
    }
};

const fetchContactsFromGHL = async () => {
    try {
        // Fetch custom field metadata
        const customFieldsMap = await fetchCustomFields();

        // Fetch contacts from GHL
        const response = await axios.get('https://rest.gohighlevel.com/v1/contacts', {
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
            },
        });

        const contacts = response.data.contacts;
        for (const contact of contacts) {
            const {
                id,
                locationId,
                contactName,
                firstName,
                lastName,
                companyName,
                email,
                phone,
                dnd,
                type,
                source,
                assignedTo,
                city,
                state,
                postalCode,
                address1,
                dateAdded,
                dateUpdated,
                dateOfBirth,
                tags,
                country,
                website,
                timezone,
                customField, // Array of custom fields
            } = contact;

            // Extract SSN and other custom fields dynamically
            let ssn = null;
            let customFieldsData = {};

            if (customField && customField.length > 0) {
                // Extract SSN
                const ssnFieldId = customFieldsMap['Debtor Social Security Number'] || customFieldsMap['Social security Number'];
                if (ssnFieldId) {
                    console.log(ssnFieldId,"ssnFieldId")
                    const ssnField = customField.find(field => field.id === ssnFieldId);
                    console.log(ssnField,"=====")
                    if (ssnField) {
                        ssn = ssnField.value; // Extract SSN value
                    }
                }

                // Extract all custom fields into an object
                customField.forEach(field => {
                    const fieldName = Object.keys(customFieldsMap).find(key => customFieldsMap[key] === field.id);
                    if (fieldName) {
                        console.log( field.value,"jjjj",fieldName)
                        customFieldsData[fieldName] = field.value;
                    }
                });
            }
            if (!ssn) {
            
                ssn = "N/A"; // Set a default value if required
            }
            // Check if the contact already exists in the database
            const existingContact = await Contact.findOne({ email });
            if (existingContact) {
                // Update the existing contact
                existingContact.id = id;
                existingContact.locationId = locationId;
                existingContact.contactName = contactName;
                existingContact.firstName = firstName;
                existingContact.lastName = lastName;
                existingContact.companyName = companyName;
                existingContact.phone = phone;
                existingContact.dnd = dnd;
                existingContact.type = type;
                existingContact.source = source;
                existingContact.assignedTo = assignedTo;
                existingContact.city = city;
                existingContact.state = state;
                existingContact.postalCode = postalCode;
                existingContact.address1 = address1;
                existingContact.dateAdded = new Date(dateAdded);
                existingContact.dateUpdated = new Date(dateUpdated);
                existingContact.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
                existingContact.tags = tags;
                existingContact.country = country;
                existingContact.website = website;
                existingContact.timezone = timezone;
                existingContact.ssn = ssn??"";
                existingContact.customFields = customFieldsData;

                // Save the updated contact to the database
                try {
                    await existingContact.save();
                    console.log('All contacts fetched and updated successfully.');
                    console.log(`✅ Contact ${email} updated successfully.`);
                } catch (error) {
                    console.error(`❌ Error updating contact ${email}:`, error);
                }
              
              
            } else {
                // Create a new contact document
                const newContact = new Contact({
                    id,
                    locationId,
                    contactName,
                    firstName,
                    lastName,
                    companyName,
                    email,
                    phone,
                    dnd,
                    type,
                    source,
                    assignedTo,
                    city,
                    state,
                    postalCode,
                    address1,
                    dateAdded: new Date(dateAdded), // Convert to Date object
                    dateUpdated: new Date(dateUpdated), // Convert to Date object
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null, // Convert to Date object if exists
                    tags,
                    country,
                    website,
                    timezone,
                    ssn, // Save SSN
                    customFields: customFieldsData, // Save all custom fields
                });

                // Save the new contact to the database
                try {
                    await newContact.save();
                    console.log('All contacts fetched and updated successfully.');
                    console.log(`✅ Contact ${email} updated successfully.`);
                } catch (error) {
                    console.error(`❌ Error updating contact ${email}:`, error);
                }
               
               
            }
        }

      
    } catch (error) {
        console.error('Error fetching contacts from Go High Level:', error.message);
    }
};

module.exports = { fetchContactsFromGHL };