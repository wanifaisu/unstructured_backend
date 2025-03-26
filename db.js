const mysql = require("mysql2");
require("dotenv").config();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 20,
  queueLimit: 0,
  waitForConnections: true,
});
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error connecting to MySQL:", err);
  } else {
    console.log("✅ Connected to MySQL database");
    connection.release(); // Release the connection back to the pool
  }
});
module.exports = pool.promise();

// const pool = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "Mike@155223",
//   database: "mysqlUnstructured",
//   port: 3306,
//   connectionLimit: 10,
// });

// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error("❌ Error connecting to MySQL:", err);
//   } else {
//     console.log("✅ Connected to Local MySQL database");
//     connection.release();
//   }
// });

// module.exports = pool.promise();
