// logger.js
const winston = require("winston");

const logger = winston.createLogger({
  level: "info", // You can set to 'debug', 'info', 'warn', 'error' based on your needs
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }), // Log to console
    new winston.transports.File({ filename: "logs/app.log" }), // Log to file
  ],
});

module.exports = logger;
