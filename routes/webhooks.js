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

        for (const key in data) {
          const match = key.match(/^Account ID (\d+)$/);
          if (match) {
            const accountIndex = parseInt(match[1]); // This should be 1, 2, 3, or 4
            const accountID =
              data[`Account ID ${accountIndex}`] ||
              (data.customData &&
                data.customData[`Account ID ${accountIndex}`]);

            if (accountID) {
              console.log(
                `Processing account ${accountID} (index ${accountIndex}) for contact ${contactData.contact_id}`
              );

              // First check if an account with this index already exists for this contact
              const [existingAccounts] = await db.query(
                "SELECT account_id FROM accounts WHERE contact_id = ? AND account_index = ?",
                [contactData.contact_id, accountIndex]
              );

              // Prepare account data
              const accountData = {
                account_id: accountID,
                contact_id: contactData.contact_id,
                account_index: accountIndex, // This must be unique per contact (1-4)
                date_first_default: validateAndFormatDate(
                  data[`Date of First Default ${accountIndex}`]
                ),
                date_origination: validateAndFormatDate(
                  data[`Date of Origination ${accountIndex}`]
                ),
                issuer: data[`Issuer ${accountIndex}`] || "",
                issuer_account_id:
                  data[`Issuer Account ID ${accountIndex}`] || "",
                package: data[`Package ${accountIndex}`] || "",
                alternate_id: data[`Alternate ID ${accountIndex}`] || "",
                state_of_origin: data[`State of Origin ${accountIndex}`] || "",
                date_charged_off: validateAndFormatDate(
                  data[`Date Charged Off ${accountIndex}`]
                ),
                current_interest_due: validateAndSanitizeNumber(
                  data[`Current Interest Due ${accountIndex}`] || 0
                ),
                fees: validateAndSanitizeNumber(
                  data[`Fees ${accountIndex}`] || 0
                ),
                amount_financed: validateAndSanitizeNumber(
                  data[`Amount Financed ${accountIndex}`] || 0
                ),
                principal: validateAndSanitizeNumber(
                  data[`Principal ${accountIndex}`] || 0
                ),
                balance: validateAndSanitizeNumber(
                  data[`Balance ${accountIndex}`] || 0
                ),
                placement_package:
                  data[`Placement Package ${accountIndex}`] || "",
                last_payment_at_purchase: validateAndSanitizeNumber(
                  data[`Amount of Last Payment at Purchase ${accountIndex}`] ||
                    0
                ),
                date_last_payment_at_purchase: validateAndFormatDate(
                  data[`Date of Last Payment at Purchase ${accountIndex}`]
                ),
                last_payment_amount: validateAndSanitizeNumber(
                  data[`Amount of Last Payment ${accountIndex}`] || 0
                ),
                date_last_payment: validateAndFormatDate(
                  data[`Date of Last Payment ${accountIndex}`]
                ),
                bank_name: data[`Bank Name ${accountIndex}`] || "",
                bank_address: data[`Bank Address Line ${accountIndex}`] || "",
                bank_city: data[`Bank City ${accountIndex}`] || "",
                bank_state: data[`Bank State ${accountIndex}`] || "",
                bank_zip: data[`Bank Zip Code ${accountIndex}`] || "",
                bank_routing: data[`Bank Routing Number ${accountIndex}`] || "",
                bank_account_number:
                  data[`Bank Account Number ${accountIndex}`] || "",
                bank_account_type:
                  data[`Bank Account Type ${accountIndex}`] || "",
                employer_name: data[`Employer Name ${accountIndex}`] || "",
                debtor_person_id:
                  data[`Debtor Person ID ${accountIndex}`] || "",
                debtor_drivers_license:
                  data[`Debtor Driver's License ${accountIndex}`] ||
                  data[`Debtor Driver\u2019s License ${accountIndex}`] ||
                  "",
                debtor_ssn:
                  data[`Debtor Social Security Number ${accountIndex}`] || "",
                debtor_credit_score: validateAndSanitizeNumber(
                  data[`Debtor Credit Score ${accountIndex}`] || 0
                ),
                has_dispute: data[`Has Dispute ${accountIndex}`] || false,
              };

              if (existingAccounts.length > 0) {
                // UPDATE existing account
                const updateQuery = `
                  UPDATE accounts SET
                    account_id = ?,
                    date_first_default = ?,
                    date_origination = ?,
                    issuer = ?,
                    issuer_account_id = ?,
                    package = ?,
                    alternate_id = ?,
                    state_of_origin = ?,
                    date_charged_off = ?,
                    current_interest_due = ?,
                    fees = ?,
                    amount_financed = ?,
                    principal = ?,
                    balance = ?,
                    placement_package = ?,
                    last_payment_at_purchase = ?,
                    date_last_payment_at_purchase = ?,
                    last_payment_amount = ?,
                    date_last_payment = ?,
                    bank_name = ?,
                    bank_address = ?,
                    bank_city = ?,
                    bank_state = ?,
                    bank_zip = ?,
                    bank_routing = ?,
                    bank_account_number = ?,
                    bank_account_type = ?,
                    employer_name = ?,
                    debtor_person_id = ?,
                    debtor_drivers_license = ?,
                    debtor_ssn = ?,
                    debtor_credit_score = ?,
                    has_dispute = ?
                  WHERE contact_id = ? AND account_index = ?
                `;

                const updateParams = [
                  accountData.account_id,
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
                  accountData.has_dispute,
                  contactData.contact_id,
                  accountIndex,
                ];

                const [updateResult] = await db.query(
                  updateQuery,
                  updateParams
                );

                if (updateResult.affectedRows === 0) {
                  console.error(
                    `Failed to update account ${accountID} (index ${accountIndex}) for contact ${contactData.contact_id}`
                  );
                } else {
                  console.log(
                    `Successfully updated account ${accountID} (index ${accountIndex}) for contact ${contactData.contact_id}`
                  );
                }
              } else {
                // INSERT new account
                const insertQuery = `
                  INSERT INTO accounts (
                    account_id, contact_id, account_index, date_first_default, date_origination,
                    issuer, issuer_account_id, package, alternate_id, state_of_origin, date_charged_off,
                    current_interest_due, fees, amount_financed, principal, balance, placement_package,
                    last_payment_at_purchase, date_last_payment_at_purchase, last_payment_amount,
                    date_last_payment, bank_name, bank_address, bank_city, bank_state, bank_zip,
                    bank_routing, bank_account_number, bank_account_type, employer_name, debtor_person_id,
                    debtor_drivers_license, debtor_ssn, debtor_credit_score, has_dispute
                  ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                  )
                `;

                try {
                  const [insertResult] = await db.query(
                    insertQuery,
                    Object.values(accountData)
                  );

                  if (insertResult.affectedRows === 1) {
                    console.log(
                      `Successfully inserted new account ${accountID} (index ${accountIndex}) for contact ${contactData.contact_id}`
                    );
                  } else {
                    console.error(
                      `Failed to insert account ${accountID} (index ${accountIndex}) for contact ${contactData.contact_id}`
                    );
                  }
                } catch (error) {
                  if (error.code === "ER_DUP_ENTRY") {
                    console.error(
                      `Duplicate entry detected for contact_id ${contactData.contact_id} and account_index ${accountIndex}. Attempting update instead.`
                    );
                    // Retry as update
                    const [updateResult] = await db.query(
                      updateQuery,
                      updateParams
                    );
                    console.log(
                      `Retried as update - affected rows: ${updateResult.affectedRows}`
                    );
                  } else {
                    throw error;
                  }
                }
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
