const express = require("express");
const db = require("../db"); // Import MySQL connection
const bcrypt = require("bcrypt"); // For hashing SSNs
const moment = require("moment");
const { encryptPayload } = require("../helpers");
const router = express.Router();

// Helper function to validate and format dates
const validateAndFormatDate = (dateValue) => {
  if (!dateValue) return null;
  const date = moment(dateValue, moment.ISO_8601, true);
  return date.isValid() ? date.format("YYYY-MM-DD") : null;
};

// Helper function to validate and sanitize numeric values
const validateAndSanitizeNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const sanitizedValue = value.replace(/[^0-9.]/g, "");
    return sanitizedValue ? parseFloat(sanitizedValue) : 0;
  }
  return 0;
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
        dateOfBirth: validateAndFormatDate(data.date_of_birth),
        tags: JSON.stringify(data.tags || []),
        country: data.country || "",
        website: data.website || "",
        timezone: data.timezone || "",
        ssn: hashedSSN || "",
        hashedFour: ssnLastFourHash || "",
        customField: JSON.stringify(data.customField || {}),
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
            `UPDATE contacts SET 
              contact_id = ?, locationId = ?, contactName = ?, firstName = ?, lastName = ?, 
              companyName = ?, phone = ?, dnd = ?, type = ?, source = ?, assignedTo = ?, 
              city = ?, state = ?, postalCode = ?, address1 = ?, dateAdded = ?, dateUpdated = ?, 
              dateOfBirth = ?, tags = ?, country = ?, website = ?, timezone = ?, ssn = ?, 
              hashedFour = ?, customField = ?
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
            `INSERT INTO contacts (
              contact_id, locationId, contactName, firstName, lastName, companyName, 
              email, phone, dnd, type, source, assignedTo, city, state, postalCode, 
              address1, dateAdded, dateUpdated, dateOfBirth, tags, country, website, 
              timezone, ssn, hashedFour, customField
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            Object.values(contactData)
          );
        }

        // Process account-related fields
        let accountRelatedIndex = 1;

        for (const key in data) {
          const match = key.match(/^Account ID (\d+)$/);
          if (match) {
            const index = match[1];
            // Check both direct property and customData for account ID
            const accountID =
              data[`Account ID ${index}`] ||
              (data.customData && data.customData[`Account ID ${index}`]);

            if (accountID) {
              console.log(
                `Processing account ${accountID} for contact ${contactData.contact_id}`
              );

              // First check if we already have an account_related_id for this account
              const [existingAccountRelation] = await db.query(
                "SELECT account_related_id FROM accounts WHERE contact_id = ? AND account_id = ?",
                [contactData.contact_id, accountID]
              );

              // Use existing account_related_id if found, otherwise use the next index
              const accountRelatedId =
                existingAccountRelation.length > 0
                  ? existingAccountRelation[0].account_related_id
                  : accountRelatedIndex++;

              const accountData = {
                contact_id: contactData.contact_id,
                account_related_id: accountRelatedId,
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
                  data[`Current Interest Due ${index}`] || 0
                ),
                fees: validateAndSanitizeNumber(data[`Fees ${index}`] || 0),
                amount_financed: validateAndSanitizeNumber(
                  data[`Amount Financed ${index}`] || 0
                ),
                principal: validateAndSanitizeNumber(
                  data[`Principal ${index}`] || 0
                ),
                balance: validateAndSanitizeNumber(
                  data[`Balance ${index}`] || 0
                ),
                placement_package: data[`Placement Package ${index}`] || "",
                last_payment_at_purchase: validateAndSanitizeNumber(
                  data[`Amount of Last Payment at Purchase ${index}`] || 0
                ),
                date_last_payment_at_purchase: validateAndFormatDate(
                  data[`Date of Last Payment at Purchase ${index}`]
                ),
                last_payment_amount: validateAndSanitizeNumber(
                  data[`Amount of Last Payment ${index}`] || 0
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
                  data[`Debtor Driver's License ${index}`] ||
                  data[`Debtor Driver\u2019s License ${index}`] ||
                  "",
                debtor_ssn:
                  data[`Debtor Social Security Number ${index}`] || "",
                debtor_credit_score: validateAndSanitizeNumber(
                  data[`Debtor Credit Score ${index}`] || 0
                ),
              };

              // Check if this specific account exists
              const [existingAccount] = await db.query(
                "SELECT * FROM accounts WHERE contact_id = ? AND account_id = ?",
                [contactData.contact_id, accountID]
              );

              if (existingAccount.length > 0) {
                // Update existing account
                await db.query(
                  `UPDATE accounts SET 
                    account_related_id = ?, date_first_default = ?, date_origination = ?, 
                    issuer = ?, issuer_account_id = ?, package = ?, alternate_id = ?, 
                    state_of_origin = ?, date_charged_off = ?, current_interest_due = ?, 
                    fees = ?, amount_financed = ?, principal = ?, balance = ?, 
                    placement_package = ?, last_payment_at_purchase = ?, 
                    date_last_payment_at_purchase = ?, last_payment_amount = ?, 
                    date_last_payment = ?, bank_name = ?, bank_address = ?, 
                    bank_city = ?, bank_state = ?, bank_zip = ?, bank_routing = ?, 
                    bank_account_number = ?, bank_account_type = ?, employer_name = ?, 
                    debtor_person_id = ?, debtor_drivers_license = ?, debtor_ssn = ?, 
                    debtor_credit_score = ?
                  WHERE contact_id = ? AND account_id = ?`,
                  [
                    accountData.account_related_id,
                    accountData.date_first_default,
                    accountData.date_origination,
                    accountData.issuer,
                    accountData.issuer_account_id,
                    accountData.package,
                    accountData.alternate_id,
                    accountData.state_of_origin,
                    accountData.date_charged_off,
                    accountData.current_interest_due,
                    accountData.fees,
                    accountData.amount_financed,
                    accountData.principal,
                    accountData.balance,
                    accountData.placement_package,
                    accountData.last_payment_at_purchase,
                    accountData.date_last_payment_at_purchase,
                    accountData.last_payment_amount,
                    accountData.date_last_payment,
                    accountData.bank_name,
                    accountData.bank_address,
                    accountData.bank_city,
                    accountData.bank_state,
                    accountData.bank_zip,
                    accountData.bank_routing,
                    accountData.bank_account_number,
                    accountData.bank_account_type,
                    accountData.employer_name,
                    accountData.debtor_person_id,
                    accountData.debtor_drivers_license,
                    accountData.debtor_ssn,
                    accountData.debtor_credit_score,
                    contactData.contact_id,
                    accountID,
                  ]
                );
                console.log(
                  `Updated account ${accountID} (related_id: ${accountRelatedId}) for contact ${contactData.contact_id}`
                );
              } else {
                // Insert new account
                await db.query(
                  `INSERT INTO accounts (
                    contact_id, account_related_id, account_id, date_first_default, date_origination, 
                    issuer, issuer_account_id, package, alternate_id, state_of_origin, date_charged_off, 
                    current_interest_due, fees, amount_financed, principal, balance, placement_package, 
                    last_payment_at_purchase, date_last_payment_at_purchase, last_payment_amount, 
                    date_last_payment, bank_name, bank_address, bank_city, bank_state, bank_zip, 
                    bank_routing, bank_account_number, bank_account_type, employer_name, debtor_person_id, 
                    debtor_drivers_license, debtor_ssn, debtor_credit_score
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  Object.values(accountData)
                );
                console.log(
                  `Created new account ${accountID} (related_id: ${accountRelatedId}) for contact ${contactData.contact_id}`
                );
              }
            }
          }
        }
        // Process offer-related fields
        for (const key in data) {
          const match = key.match(/^Lender (\d+)$/);
          if (match) {
            const index = match[1];
            const lender = data[`Lender ${index}`];

            if (lender) {
              const offerData = {
                contact_id: contactData.contact_id,
                account_related_id: index,
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

              // Check if offer exists
              const [existingOffer] = await db.query(
                "SELECT * FROM Offers WHERE contact_id = ? AND account_related_id = ?",
                [contactData.contact_id, index]
              );

              if (existingOffer.length > 0) {
                await db.query(
                  `UPDATE Offers SET 
                    lender = ?, total_debt_amount = ?, settlement_amount = ?, settlement_percentage = ?
                   WHERE contact_id = ? AND account_related_id = ?`,
                  [
                    offerData.lender,
                    offerData.total_debt_amount,
                    offerData.settlement_amount,
                    offerData.settlement_percentage,
                    contactData.contact_id,
                    index,
                  ]
                );
              } else {
                await db.query(
                  `INSERT INTO Offers (
                    contact_id, account_related_id, lender, total_debt_amount, 
                    settlement_amount, settlement_percentage
                  ) VALUES (?, ?, ?, ?, ?, ?)`,
                  Object.values(offerData)
                );
              }
            }
          }
        }
      } catch (error) {
        console.error(
          "Error processing contact:",
          contactData.contact_id,
          error
        );
        throw error;
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
