const CryptoJS = require("crypto-js");
require("dotenv").config();
function encryptSSN(ssn) {
  const iv = CryptoJS.lib.WordArray.random(16); // Generate a random IV
  const encrypted = CryptoJS.AES.encrypt(ssn, process.env.PUBLIC_KEY, { iv });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.toString()}`;
}
function decryptSSN(encryptedSSN) {
  const parts = encryptedSSN.split(":");
  const iv = CryptoJS.enc.Hex.parse(parts[0]);
  const encryptedText = parts[1];
  const decrypted = CryptoJS.AES.decrypt(
    encryptedText,
    process.env.PUBLIC_KEY,
    { iv }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}
function encryptPayload(payload, secretKey) {
  const ciphertext = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    secretKey
  ).toString();
  return ciphertext;
}
module.exports = { encryptSSN, decryptSSN, encryptPayload };
