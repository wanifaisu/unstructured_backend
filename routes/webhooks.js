const express = require("express");
const db = require("../db"); // Import MySQL connection
const moment = require("moment");
require("dotenv").config();
const { encryptPayload } = require("../helpers");
// const pdcflow = require("../paymentSignature");
const router = express.Router();

const validateAndFormatDate = (dateValue) => {
  if (!dateValue) return null;
  const date = moment(dateValue, moment.ISO_8601, true);
  return date.isValid() ? date.format("YYYY-MM-DD") : null;
};
const validateAndSanitizeNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const sanitizedValue = value.replace(/[^0-9.]/g, "");
    return sanitizedValue ? parseFloat(sanitizedValue) : 0;
  }
  return 0;
};

router.post("/", async (req, res) => {
  try {
    const contacts = Array.isArray(req.body) ? req.body : [req.body];
    const payload = req.body;
    console.log("Webhook Payload:", JSON.stringify(payload, null, 2));
    for (let data of contacts) {
      const rawSSN = data["Social Security Number"];
      let hashedSSN = "";
      let ssnLastFourHash = "";
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
        // const result = await pdcflow.main({
        //   firstName: contactData.firstName,
        //   lastName: contactData.lastName,
        //   email: contactData.email,
        //   phone: contactData.phone,
        // });
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
        for (const key in data) {
          const match = key.match(/^Account ID (\d+)$/);

          if (match) {
            const index = match[1];
            const accountID = data[`Account ID ${index}`];

            if (accountID) {
              const accountData = {
                contact_id: contactData.contact_id,
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

              // 1. Check if the contact exists
              const [existingContact] = await db.query(
                "SELECT * FROM accounts WHERE contact_id = ?",
                [contactData.contact_id]
              );

              if (existingContact.length > 0) {
                // 2. If contact exists, now check if the account_id matches for this contact
                const [existingAccount] = await db.query(
                  "SELECT * FROM accounts WHERE account_id = ? AND contact_id = ?",
                  [accountID, contactData.contact_id]
                );

                if (existingAccount.length > 0) {
                  // 3. Account exists for this contact, update the existing account
                  logger.info(
                    `Account with Account ID ${accountID} and Contact ID ${contactData.contact_id} exists, updating...`
                  );
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
                  // 4. Account doesn't exist for this contact, insert new account for the same contact
                  logger.info(
                    `Account with Account ID ${accountID} does not exist for Contact ID ${contactData.contact_id}, inserting new account...`
                  );
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
              } else {
                // 5. No contact found, insert a new account with the contact_id and account_id
                logger.info(
                  `No contact found with Contact ID ${contactData.contact_id}, inserting new contact and account...`
                );
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

              // 1. Check if the contact exists
              const [existingContact] = await db.query(
                "SELECT * FROM accounts WHERE contact_id = ?",
                [contactData.contact_id]
              );

              if (existingContact.length > 0) {
                // 2. If contact exists, now check if the offer (account_related_id) exists for this contact
                const [existingOffer] = await db.query(
                  "SELECT * FROM Offers WHERE contact_id = ? AND account_related_id = ?",
                  [contactData.contact_id, index]
                );

                if (existingOffer.length > 0) {
                  // 3. Offer exists for this contact, update the existing offer
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
                  // 4. Offer does not exist for this contact, insert a new offer for the same contact
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
              } else {
                // 5. No contact found, insert new offer with the contact_id and account_related_id
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
    logger.info(`Getting Error ${error.message}`);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
