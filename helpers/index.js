const crypto = require("crypto");

const SECRET_KEY = process.env.PUBLIC_KEY
  ? Buffer.from(process.env.PUBLIC_KEY, "hex")
  : crypto.randomBytes(32);
const IV_LENGTH = 16;
// Function to Encrypt SSN
function encryptSSN(ssn) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", SECRET_KEY, iv);
  let encrypted = cipher.update(ssn, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

// Function to Decrypt SSN
function decryptSSN(encryptedSSN) {
  try {
    const parts = encryptedSSN.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const authTag = Buffer.from(parts[2], "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", SECRET_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("❌ Decryption failed:", error.message);
    return null;
  }
}

// ✅ Use CommonJS export
module.exports = { encryptSSN, decryptSSN };
