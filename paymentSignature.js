const fs = require("fs");
const https = require("https");
const axios = require("axios");
require("dotenv").config();

// Configuration
const config = {
  pdcflow: {
    api: {
      documents: "https://flowdemo.pdcflow.com/api/v2_0/documents",
      signatures: "https://flowdemo.pdcflow.com/api/v2_0/signatures",
    },
    auth: {
      username: process.env.PAPI_USR,
      password: process.env.PAPI_USR_PASS,
      apiKey: process.env.PAPI_KEY,
    },
    customerId: "01994943",
    pdfUrl:
      "http://structuredsettlement.agency/wp-content/uploads/2025/02/test_agreement.pdf",
  },
  files: {
    payloadLog: "pdcflow_payload.json",
    documentLog: "pdcflow_document_log.txt",
    signatureLog: "pdcflow_log.txt",
    errorLog: "pdcflow_error_log.txt",
  },
};

// Initialize with Basic Auth
const authHeader = `Basic ${Buffer.from(
  `${config.pdcflow.auth.username}:${config.pdcflow.auth.password}`
).toString("base64")}`;

async function main() {
  try {
    const pdfContent = await getPdfDocument(config.pdcflow.pdfUrl);
    const documentId = await uploadDocument(pdfContent);
    const signatureResponse = await requestSignature(documentId);
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

// Core functions
async function getPdfDocument(url) {
  try {
    // Verify PDF exists
    await axios.head(url, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    // Download and encode
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    return {
      content: response.data.toString("base64"),
      name: url.split("/").pop() || "document.pdf",
    };
  } catch (error) {
    throw new Error(`Failed to get PDF document: ${error.message}`);
  }
}

async function uploadDocument(pdf) {
  const payload = {
    customer_id: config.pdcflow.customerId,
    name: pdf.name,
    documentBase64String: pdf.content,
  };

  try {
    const response = await makeRequest(config.pdcflow.api.documents, payload);

    // Log successful upload
    fs.appendFileSync(
      config.files.documentLog,
      `[${new Date().toISOString()}] Upload Successful\n` +
        `HTTP ${response.status}\n` +
        `${JSON.stringify(response.data, null, 2)}\n\n`
    );

    if (!response.data.documentId) {
      throw new Error("No documentId received in upload response");
    }

    return response.data.documentId;
  } catch (error) {
    throw new Error(`Document upload failed: ${error.message}`);
  }
}

async function requestSignature(documentId, contactData) {
  try {
    const payload = {
      customMessage: "Thank you for buying!",
      description: "Agreement for mortgage.",
      emailAddress: contactData?.email,
      firstName: contactData?.firstName,
      lastName: contactData?.lastName,
      maxPinAttempts: "2",
      mobileNumber: contactData?.phone,
      pinDescription: "Last four of your social security number",
      verificationPageHeader:
        "Text that will be displayed at the top of the verification page",
      redirectLink: "https://www.pdcflow.com",
      requestGeolocation: true,
      document: {
        documentId: documentId,
      },

      standaloneSignatureRequested: true,
      templateName: "SignatureOnly",
      timeoutMinutes: "4.5",
      transactionOrigin: "EXT",
      username: process.env.PAPI_USR,
      verificationPin: "1235",
      postbackUrl: "https://www.testpostbackaddress.com",
    };

    // API Configuration
    const url = "https://flowdemo.pdcflow.com/api/v2_0/signatures";
    const username = process.env.PAPI_USR;
    const password = process.env.PAPI_USR_PASS;

    if (!username || !password) {
      throw new Error("Missing PDCflow API credentials");
    }

    // Make the request
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      auth: {
        username: username,
        password: password,
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      "Failed to create signature request: " +
        error.response?.data?.requestErrorList
          ?.map((err) => err.description)
          .join("; ")
    );
  }
}
// Helper functions
async function makeRequest(url, payload) {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Length": Buffer.byteLength(JSON.stringify(payload)),
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    maxRedirects: 5,
  };

  try {
    const response = await axios.post(url, payload, config);
    return response;
  } catch (error) {
    if (error.response) {
      error.details = {
        status: error.response.status,
        data: error.response.data,
        requestPayload: payload,
      };
    }
    throw error;
  }
}

function handleError(error) {
  const timestamp = new Date().toISOString();
  let errorMessage = `[${timestamp}] Error Occurred\n`;

  if (error.details) {
    errorMessage +=
      `HTTP ${error.details.status}\n` +
      `Response: ${JSON.stringify(error.details.data, null, 2)}\n` +
      `Request: ${JSON.stringify(error.details.requestPayload, null, 2)}\n`;
  } else {
    errorMessage += `${error.stack || error.message}\n`;
  }
  fs.appendFileSync(config.files.errorLog, errorMessage + "\n");
}
module.exports = {
  main: async function (contactData = {}) {
    try {
      const pdfContent = await getPdfDocument(config.pdcflow.pdfUrl);
      const documentId = await uploadDocument(pdfContent);
      const signatureResponse = await requestSignature(documentId, contactData);
      return signatureResponse;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};
