const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "mysql1001.site4now.net",
  user: "ab6902_unifi",
  password: "Faisal@155223",
  database: "db_ab6902_unifi",
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

// const mysql = require("mysql2");

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
