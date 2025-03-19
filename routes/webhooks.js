const express = require("express");
const db = require("../db"); // Import MySQL connection
const bcrypt = require("bcrypt"); // For hashing SSNs
const moment = require("moment");
const { encryptSSN } = require("../helpers");
const router = express.Router();

// Helper function to validate and format dates
const validateAndFormatDate = (dateValue) => {
  if (!dateValue) return null; // If the value is missing, return null
  const date = moment(dateValue, moment.ISO_8601, true); // Parse the date strictly
  return date.isValid() ? date.format("YYYY-MM-DD") : null; // Return formatted date or null if invalid
};

// Helper function to validate and sanitize numeric values
const validateAndSanitizeNumber = (value) => {
  if (typeof value === "number") return value; // If it's already a number, return it
  if (typeof value === "string") {
    // Remove non-numeric characters (e.g., letters, symbols)
    const sanitizedValue = value.replace(/[^0-9.]/g, "");
    return sanitizedValue ? parseFloat(sanitizedValue) : 0; // Convert to number or return 0 if empty
  }
  return 0; // Default to 0 for invalid types
};

// Webhook endpoint for GHL
router.post("/", async (req, res) => {
  try {
    const contacts = Array.isArray(req.body) ? req.body : [req.body];
    console.log("Received webhook data:", JSON.stringify(req.body, null, 2));

    for (let data of contacts) {
      const rawSSN = data["Social security Number"];
      let hashedSSN = "";
      let ssnLastFourHash = "";

      // Hash SSN if it exists
      if (rawSSN) {
        const salt = await bcrypt.genSalt(10);
        hashedSSN = await bcrypt.hash(rawSSN.toString(), salt);
        const lastFourSSN = rawSSN.toString().slice(-4);
        ssnLastFourHash = await encryptSSN(lastFourSSN);
      }

      // Prepare contact data
      const contactData = {
        contact_id: data.contact_id || "",
        locationId: data.locationId || "",
        contactName: data.full_name || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        companyName: data.companyName || "",
        email: data.email || "",
        phone: data.phone || "",
        dnd: data.dnd || false,
        type: data.type || "",
        source: data.source || "",
        assignedTo: data.assignedTo || "",
        city: data.city || "",
        state: data.state || "",
        postalCode: data.postalCode || "",
        address1: data.address1 || "",
        dateAdded: moment(data.date_created || new Date()).format(
          "YYYY-MM-DD HH:mm:ss"
        ),
        dateUpdated: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
        dateOfBirth: validateAndFormatDate(data.date_of_birth), // Validate and format date
        tags: JSON.stringify(data.tags || []), // Store tags as JSON
        country: data.country || "",
        website: data.website || "",
        timezone: data.timezone || "",
        ssn: hashedSSN || "",
        hashedFour: ssnLastFourHash || "",
        customField: JSON.stringify(data.customField || {}), // Store customField as JSON
      };

      console.log(contactData, "----------------");

      try {
        // Check if contact already exists
        const [existingContact] = await db.query(
          "SELECT * FROM contacts WHERE email = ?",
          [contactData.email]
        );

        if (existingContact.length > 0) {
          // Update existing contact
          await db.query(
            `UPDATE contacts 
             SET 
               contact_id = ?, 
               locationId = ?, 
               contactName = ?, 
               firstName = ?, 
               lastName = ?, 
               companyName = ?, 
               phone = ?, 
               dnd = ?, 
               type = ?, 
               source = ?, 
               assignedTo = ?, 
               city = ?, 
               state = ?, 
               postalCode = ?, 
               address1 = ?, 
               dateAdded = ?, 
               dateUpdated = ?, 
               dateOfBirth = ?, 
               tags = ?, 
               country = ?, 
               website = ?, 
               timezone = ?, 
               ssn = ?, 
               hashedFour = ?, 
               customField = ?
             WHERE email = ?`,
            [
              contactData.contact_id,
              contactData.locationId,
              contactData.contactName,
              contactData.firstName,
              contactData.lastName,
              contactData.companyName,
              contactData.phone,
              contactData.dnd,
              contactData.type,
              contactData.source,
              contactData.assignedTo,
              contactData.city,
              contactData.state,
              contactData.postalCode,
              contactData.address1,
              contactData.dateAdded,
              contactData.dateUpdated,
              contactData.dateOfBirth,
              contactData.tags,
              contactData.country,
              contactData.website,
              contactData.timezone,
              contactData.ssn,
              contactData.hashedFour,
              contactData.customField,
              contactData.email, // WHERE clause
            ]
          );
        } else {
          // Insert new contact
          await db.query(
            `INSERT INTO contacts 
             (
               contact_id, locationId, contactName, firstName, lastName, companyName, 
               email, phone, dnd, type, source, assignedTo, city, state, postalCode, 
               address1, dateAdded, dateUpdated, dateOfBirth, tags, country, website, 
               timezone, ssn, hashedFour, customField
             ) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contactData.contact_id,
              contactData.locationId,
              contactData.contactName,
              contactData.firstName,
              contactData.lastName,
              contactData.companyName,
              contactData.email,
              contactData.phone,
              contactData.dnd,
              contactData.type,
              contactData.source,
              contactData.assignedTo,
              contactData.city,
              contactData.state,
              contactData.postalCode,
              contactData.address1,
              contactData.dateAdded,
              contactData.dateUpdated,
              contactData.dateOfBirth,
              contactData.tags,
              contactData.country,
              contactData.website,
              contactData.timezone,
              contactData.ssn,
              contactData.hashedFour,
              contactData.customField,
            ]
          );
        }

        // Process account-related fields
        for (const key in data) {
          const match = key.match(/^Account ID (\d+)$/); // Regex to capture account index
          if (match) {
            const index = match[1]; // Extract the number (1, 2, 3, ...)
            const accountID = data[`Account ID ${index}`];

            if (accountID) {
              const accountData = {
                contact_id: contactData.contact_id,
                account_id: accountID,
                date_first_default: validateAndFormatDate(
                  data[`Date of First Default ${index}`]
                ), // Validate and format date
                date_origination: validateAndFormatDate(
                  data[`Date of Origination ${index}`]
                ), // Validate and format date
                issuer: data[`Issuer ${index}`] || "",
                issuer_account_id: data[`Issuer Account ID ${index}`] || "",
                package: data[`Package ${index}`] || "",
                alternate_id: data[`Alternate ID ${index}`] || "",
                state_of_origin: data[`State of Origin ${index}`] || "",
                date_charged_off: validateAndFormatDate(
                  data[`Date Charged Off ${index}`]
                ), // Validate and format date
                current_interest_due: validateAndSanitizeNumber(
                  data[`Current Interest Due ${index}`]
                ), // Validate and sanitize number
                fees: validateAndSanitizeNumber(data[`Fees ${index}`]), // Validate and sanitize number
                amount_financed: validateAndSanitizeNumber(
                  data[`Amount Financed ${index}`]
                ), // Validate and sanitize number
                principal: validateAndSanitizeNumber(
                  data[`Principal ${index}`]
                ), // Validate and sanitize number
                balance: validateAndSanitizeNumber(data[`Balance ${index}`]), // Validate and sanitize number
                placement_package: data[`Placement Package ${index}`] || "",
                last_payment_at_purchase: validateAndSanitizeNumber(
                  data[`Amount of Last Payment at Purchase ${index}`]
                ), // Validate and sanitize number
                date_last_payment_at_purchase: validateAndFormatDate(
                  data[`Date of Last Payment at Purchase ${index}`]
                ), // Validate and format date
                last_payment_amount: validateAndSanitizeNumber(
                  data[`Amount of Last Payment ${index}`]
                ), // Validate and sanitize number
                date_last_payment: validateAndFormatDate(
                  data[`Date of Last Payment ${index}`]
                ), // Validate and format date
                bank_name: data[`Bank Name ${index}`] || "",
                bank_address: data[`Bank Address Line ${index}`] || "",
                bank_city: data[`Bank City ${index}`] || "",
                bank_state: data[`Bank State ${index}`] || "",
                bank_zip: data[`Bank Zip Code ${index}`] || "",
                bank_routing: data[`Bank Routing Number ${index}`] || "",
                bank_account_number: data[`Bank Account Number ${index}`] || "",
                bank_account_type: data[`Bank Account Type ${index}`] || "",
                employer_name: data[`Employer Name ${index}`] || "",
                debtor_person_id: data[`Debtor Person ID ${index}`] || "",
                debtor_drivers_license:
                  data[`Debtor Driver’s License ${index}`] || "",
                debtor_ssn:
                  data[`Debtor Social Security Number ${index}`] || "",
                debtor_credit_score: validateAndSanitizeNumber(
                  data[`Debtor Credit Score ${index}`]
                ), // Validate and sanitize number
              };

              // Check if account already exists
              const [existingAccount] = await db.query(
                "SELECT * FROM accounts WHERE account_id = ? AND contact_id = ?",
                [accountID, contactData.contact_id]
              );

              if (existingAccount.length > 0) {
                // Update existing account
                await db.query(
                  `UPDATE accounts 
                   SET date_first_default = ?, date_origination = ?, issuer = ?, issuer_account_id = ?, 
                       package = ?, alternate_id = ?, state_of_origin = ?, date_charged_off = ?, 
                       current_interest_due = ?, fees = ?, amount_financed = ?, principal = ?, balance = ?, 
                       placement_package = ?, last_payment_at_purchase = ?, date_last_payment_at_purchase = ?, 
                       last_payment_amount = ?, date_last_payment = ?, bank_name = ?, bank_address = ?, 
                       bank_city = ?, bank_state = ?, bank_zip = ?, bank_routing = ?, bank_account_number = ?, 
                       bank_account_type = ?, employer_name = ?, debtor_person_id = ?, debtor_drivers_license = ?, 
                       debtor_ssn = ?, debtor_credit_score = ?
                   WHERE account_id = ? AND contact_id = ?`,
                  [
                    ...Object.values(accountData),
                    accountID,
                    contactData.contact_id,
                  ]
                );
              } else {
                // Insert new account
                await db.query(
                  `INSERT INTO accounts (
                    contact_id, account_id, date_first_default, date_origination, issuer, issuer_account_id, package, 
                    alternate_id, state_of_origin, date_charged_off, current_interest_due, fees, amount_financed, 
                    principal, balance, placement_package, last_payment_at_purchase, date_last_payment_at_purchase, 
                    last_payment_amount, date_last_payment, bank_name, bank_address, bank_city, bank_state, bank_zip, 
                    bank_routing, bank_account_number, bank_account_type, employer_name, debtor_person_id, 
                    debtor_drivers_license, debtor_ssn, debtor_credit_score
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  Object.values(accountData)
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Error processing contact or account:", error);
        throw error; // Re-throw to be caught by the outer try-catch
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
