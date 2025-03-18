const express = require("express");
const db = require("../db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const { encryptSSN } = require("../helpers");
const router = express.Router();

// Webhook endpoint for GHL
router.post("/", async (req, res) => {
  try {
    const contacts = Array.isArray(req.body) ? req.body : [req.body];
    console.log("Received webhook data:", JSON.stringify(req.body, null, 2));

    for (let data of contacts) {
      const rawSSN = data["Debtor Social Security Number"];
      let hashedSSN = "";
      let ssnLastFourHash = "";

      if (rawSSN) {
        const salt = await bcrypt.genSalt(10);
        hashedSSN = await bcrypt.hash(rawSSN.toString(), salt);
        const lastFourSSN = rawSSN.toString().slice(-4);
        ssnLastFourHash = await encryptSSN(lastFourSSN);
      }

      // Format the incoming data
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
        dateOfBirth: data.date_of_birth
          ? moment(data.date_of_birth).format("YYYY-MM-DD")
          : null,
        tags: JSON.stringify(data.tags || []),
        country: data.country || "",
        timezone: data.timezone || "",
        full_address: data.full_address || "",
        ssn: hashedSSN || "",
        hashedFour: ssnLastFourHash || "",
        customField: JSON.stringify(data.customField || {}),

        // New fields
        collectPayment: data["Collect Payment"] || "",
        totalDebtAmount: data["Total Debt Amount"] || "",
        settlementAmount: data["Settlement Amount"] || "",
        settlementPercentage: data["Settlement Percentage %"] || "",
        accountID: data["Account ID"] || "",
        dateOfFirstDefault: data["Date of First Default"] || "",
        dateOfOrigination: data["Date of Origination"] || "",
        issuer: data["Issuer"] || "",
        issuerAccountID: data["Issuer Account ID"] || "",
        package: data["Package"] || "",
        alternateID: data["Alternate ID"] || "",
        stateOfOrigin: data["State of Origin"] || "",
        dateChargedOff: data["Date Charged Off"] || "",
        currentInterestDue: data["Current Interest Due"] || "",
        fees: data["Fees"] || "",
        amountFinanced: data["Amount Financed"] || "",
        principal: data["Principal"] || "",
        balance: data["Balance"] || "",
        placementPackage: data["Placement Package"] || "",
        lastPaymentAmountAtPurchase:
          data["Amount of Last Payment at Purchase"] || "",
        lastPaymentDateAtPurchase:
          data["Date of Last Payment at Purchase"] || "",
        lastPaymentAmount: data["Amount of Last Payment"] || "",
        lastPaymentDate: data["Date of Last Payment"] || "",
        bankName: data["Bank Name"] || "",
        bankAddressLine1: data["Bank Address Line 1"] || "",
        bankCity: data["Bank City"] || "",
        bankState: data["Bank State"] || "",
        bankZipCode: data["Bank Zip Code"] || "",
        bankRoutingNumber: data["Bank Routing Number"] || "",
        bankAccountNumber: data["Bank Account Number"] || "",
        bankAccountType: data["Bank Account Type"] || "",
        employerName: data["Employer Name"] || "",
        debtorPersonID: data["Debtor Person ID"] || "",
        debtorDriversLicense: data["Debtor Driver’s License"] || "",
        debtorCreditScore: data["Debtor Credit Score"] || "",
      };

      console.log("Formatted Data to Insert:", contactData);

      try {
        // Check if the contact already exists
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
                dateOfBirth = ?, tags = ?, country = ?, timezone = ?, full_address = ?, ssn = ?,
                hashedFour = ?, customField = ?, collectPayment = ?, totalDebtAmount = ?, settlementAmount = ?,
                settlementPercentage = ?, accountID = ?, dateOfFirstDefault = ?, dateOfOrigination = ?, issuer = ?,
                issuerAccountID = ?, package = ?, alternateID = ?, stateOfOrigin = ?, dateChargedOff = ?,
                currentInterestDue = ?, fees = ?, amountFinanced = ?, principal = ?, balance = ?, 
                placementPackage = ?, lastPaymentAmountAtPurchase = ?, lastPaymentDateAtPurchase = ?, 
                lastPaymentAmount = ?, lastPaymentDate = ?, bankName = ?, bankAddressLine1 = ?, 
                bankCity = ?, bankState = ?, bankZipCode = ?, bankRoutingNumber = ?, bankAccountNumber = ?, 
                bankAccountType = ?, employerName = ?, debtorPersonID = ?, debtorDriversLicense = ?, 
                debtorCreditScore = ? WHERE email = ?`,
            [...Object.values(contactData), contactData.email]
          );
          console.log(`✅ Updated contact: ${contactData.email}`);
        } else {
          // Insert new contact
          await db.query(
            `INSERT INTO contacts (
              ${Object.keys(contactData).join(", ")}
            ) VALUES (${Object.keys(contactData)
              .map(() => "?")
              .join(", ")})`,
            Object.values(contactData)
          );
          console.log(`✅ New contact added: ${contactData.email}`);
        }
      } catch (error) {
        console.error("❌ Error processing webhook:", error);
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
