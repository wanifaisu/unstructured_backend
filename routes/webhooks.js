const express = require("express");
const db = require("../db"); // Import MySQL connection
const bcrypt = require("bcrypt"); // For hashing SSNs
const moment = require("moment");
const { encryptPayload } = require("../helpers");
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
    const payload = req.body;
    console.log("Webhook Payload:", JSON.stringify(payload, null, 2));
    for (let data of contacts) {
      const rawSSN = data["Social Security Number"];
      let hashedSSN = "";
      let ssnLastFourHash = "";

      // Hash SSN if it exists
      if (rawSSN) {
        hashedSSN = await encryptPayload(
          rawSSN,
          process.env.PUBLIC_KEY_ENCREPT
        );
        const lastFourSSN = rawSSN.toString().slice(-4);
        ssnLastFourHash = await encryptPayload(
          lastFourSSN,
          process.env.PUBLIC_KEY_ENCREPT
        );
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
              contactData.email,
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
        let accountRelatedIndex = 1; // Start indexing from 1

        for (const key in data) {
          const match = key.match(/^Account ID (\d+)$/);

          if (match) {
            const index = match[1];
            const accountID = data[`Account ID ${index}`];

            if (accountID) {
              console.log(accountID, "is present ");
              const accountData = {
                contact_id: contactData.contact_id,
                account_related_id: accountRelatedIndex++, // Add unique index 1, 2, 3, ...
                account_id: accountID,
                date_first_default: validateAndFormatDate(
                  data[`Date of First Default ${index}`]
                ),
                date_origination: validateAndFormatDate(
                  data[`Date of Origination ${index}`]
                ),
                issuer: data[`Issuer ${index}`] || "",
                issuer_account_id: data[`Issuer Account ID ${index}`] || "",
                package: data[`Package ${index}`] || "",
                alternate_id: data[`Alternate ID ${index}`] || "",
                state_of_origin: data[`State of Origin ${index}`] || "",
                date_charged_off: validateAndFormatDate(
                  data[`Date Charged Off ${index}`]
                ),
                current_interest_due: validateAndSanitizeNumber(
                  data[`Current Interest Due ${index}`]
                ),
                fees: validateAndSanitizeNumber(data[`Fees ${index}`]),
                amount_financed: validateAndSanitizeNumber(
                  data[`Amount Financed ${index}`]
                ),
                principal: validateAndSanitizeNumber(
                  data[`Principal ${index}`]
                ),
                balance: validateAndSanitizeNumber(data[`Balance ${index}`]),
                placement_package: data[`Placement Package ${index}`] || "",
                last_payment_at_purchase: validateAndSanitizeNumber(
                  data[`Amount of Last Payment at Purchase ${index}`]
                ),
                date_last_payment_at_purchase: validateAndFormatDate(
                  data[`Date of Last Payment at Purchase ${index}`]
                ),
                last_payment_amount: validateAndSanitizeNumber(
                  data[`Amount of Last Payment ${index}`]
                ),
                date_last_payment: validateAndFormatDate(
                  data[`Date of Last Payment ${index}`]
                ),
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
                ),
              };

              // Check if contact exists
              const [existingContact] = await db.query(
                "SELECT * FROM accounts WHERE contact_id = ?",
                [contactData.contact_id]
              );

              if (existingContact.length > 0) {
                const [existingAccount] = await db.query(
                  "SELECT * FROM accounts WHERE contact_id = ? AND account_related_id = ?",
                  [contactData.contact_id, accountData.account_related_id]
                );
                console.log("is existing contact ");
                if (existingAccount.length > 0) {
                  console.log("is existing account");
                  await db.query(
                    `UPDATE accounts 
                     SET date_first_default = ?, date_origination = ?, issuer = ?, issuer_account_id = ?, 
                         package = ?, alternate_id = ?, state_of_origin = ?, date_charged_off = ?, 
                         current_interest_due = ?, fees = ?, amount_financed = ?, principal = ?, balance = ?, 
                         placement_package = ?, last_payment_at_purchase = ?, date_last_payment_at_purchase = ?, 
                         last_payment_amount = ?, date_last_payment = ?, bank_name = ?, bank_address = ?, 
                         bank_city = ?, bank_state = ?, bank_zip = ?, bank_routing = ?, bank_account_number = ?, 
                         bank_account_type = ?, employer_name = ?, debtor_person_id = ?, debtor_drivers_license = ?, 
                         debtor_ssn = ?, debtor_credit_score = ?, account_related_id = ?
                     WHERE account_id = ? AND contact_id = ?`,
                    [
                      ...Object.values(accountData),
                      accountID,
                      contactData.contact_id,
                    ]
                  );
                } else {
                  await db.query(
                    `INSERT INTO accounts (
                      contact_id, account_related_id, account_id, date_first_default, date_origination, issuer, 
                      issuer_account_id, package, alternate_id, state_of_origin, date_charged_off, current_interest_due, 
                      fees, amount_financed, principal, balance, placement_package, last_payment_at_purchase, 
                      date_last_payment_at_purchase, last_payment_amount, date_last_payment, bank_name, bank_address, 
                      bank_city, bank_state, bank_zip, bank_routing, bank_account_number, bank_account_type, 
                      employer_name, debtor_person_id, debtor_drivers_license, debtor_ssn, debtor_credit_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    Object.values(accountData)
                  );
                }
              } else {
                await db.query(
                  `INSERT INTO accounts (
                    contact_id, account_related_id, account_id, date_first_default, date_origination, issuer, 
                    issuer_account_id, package, alternate_id, state_of_origin, date_charged_off, current_interest_due, 
                    fees, amount_financed, principal, balance, placement_package, last_payment_at_purchase, 
                    date_last_payment_at_purchase, last_payment_amount, date_last_payment, bank_name, bank_address, 
                    bank_city, bank_state, bank_zip, bank_routing, bank_account_number, bank_account_type, 
                    employer_name, debtor_person_id, debtor_drivers_license, debtor_ssn, debtor_credit_score
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  Object.values(accountData)
                );
              }
            }
          }
        }

        // Add this after the account processing logic
        for (const key in data) {
          const match = key.match(/^Lender (\d+)$/); // Regex to capture offer index
          if (match) {
            const index = match[1]; // Extract the number (1, 2, 3, ...)
            const lender = data[`Lender ${index}`];

            if (lender) {
              const offerData = {
                contact_id: contactData.contact_id,
                account_related_id: index, // Add account_related_id (e.g., 1, 2, 3, ...)
                lender: lender,
                total_debt_amount: validateAndSanitizeNumber(
                  data[`Total Debt Amount ${index}`]
                ),
                settlement_amount: validateAndSanitizeNumber(
                  data[`Settlement Amount ${index}`]
                ),
                settlement_percentage: validateAndSanitizeNumber(
                  data[`Settlement Percentage % ${index}`]
                ),
              };

              // Check if offer already exists
              const [existingOffer] = await db.query(
                "SELECT * FROM Offers WHERE contact_id = ? AND account_related_id = ?",
                [contactData.contact_id, index]
              );

              if (existingOffer.length > 0) {
                // Update existing offer
                await db.query(
                  `UPDATE Offers 
                   SET 
                     lender = ?, 
                     total_debt_amount = ?, 
                     settlement_amount = ?, 
                     settlement_percentage = ?
                   WHERE contact_id = ? AND account_related_id = ?`,
                  [
                    offerData.lender,
                    offerData.total_debt_amount,
                    offerData.settlement_amount,
                    offerData.settlement_percentage,
                    contactData.contact_id,
                    index, // Use account_related_id for the WHERE clause
                  ]
                );
              } else {
                // Insert new offer
                await db.query(
                  `INSERT INTO Offers (
                     contact_id, 
                     account_related_id, 
                     lender, 
                     total_debt_amount, 
                     settlement_amount, 
                     settlement_percentage
                   ) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    offerData.contact_id,
                    offerData.account_related_id,
                    offerData.lender,
                    offerData.total_debt_amount,
                    offerData.settlement_amount,
                    offerData.settlement_percentage,
                  ]
                );
              }
            }
          }
        }
      } catch (error) {
        throw error;
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
