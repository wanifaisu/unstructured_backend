const axios = require("axios");
const dotenv = require("dotenv");
const Contact = require("../models/Contact");

dotenv.config();

const GHL_API_KEY = process.env.GHL_API_KEY;

// Fetch custom field metadata from GHL
const fetchCustomFields = async () => {
  try {
    const response = await axios.get(process.env.GHL_CUSTOM_URL, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
      },
    });
    const customFieldsMap = {};
    response.data.customFields.forEach((field) => {
      customFieldsMap[field.name] = field.id;
    });

    return customFieldsMap;
  } catch (error) {
    return {};
  }
};

const fetchContactsFromGHL = async () => {
  try {
    const customFieldsMap = await fetchCustomFields();
    const response = await axios.get(process.env.GHL_URL, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
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
        customField,
      } = contact;

      let ssn = null;
      let customFieldsData = {};

      if (customField && customField.length > 0) {
        const ssnFieldId =
          customFieldsMap["Debtor Social Security Number"] ||
          customFieldsMap["Social security Number"];
        if (ssnFieldId) {
          const ssnField = customField.find((field) => field.id === ssnFieldId);

          if (ssnField) {
            ssn = ssnField.value;
          }
        }
        customField.forEach((field) => {
          const fieldName = Object.keys(customFieldsMap).find(
            (key) => customFieldsMap[key] === field.id
          );
          if (fieldName) {
            customFieldsData[fieldName] = field.value;
          }
        });
      }
      if (!ssn) {
        ssn = "N/A";
      }
      const existingContact = await Contact.findOne({ email });
      if (existingContact) {
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
        existingContact.dateOfBirth = dateOfBirth
          ? new Date(dateOfBirth)
          : null;
        existingContact.tags = tags;
        existingContact.country = country;
        existingContact.website = website;
        existingContact.timezone = timezone;
        existingContact.ssn = ssn ?? "";
        existingContact.customFields = customFieldsData;
        try {
          await existingContact.save();
        } catch (error) {
          console.error(`❌ Error updating contact ${email}:`, error);
        }
      } else {
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
          dateAdded: new Date(dateAdded),
          dateUpdated: new Date(dateUpdated),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          tags,
          country,
          website,
          timezone,
          ssn,
          customFields: customFieldsData,
        });
        try {
          await newContact.save();
        } catch (error) {
          console.error(`❌ Error updating contact ${email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching contacts from Go High Level:", error.message);
  }
};

module.exports = { fetchContactsFromGHL };
