const mysql = require('mysql');

// const connection = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "",
//     database: "ahead"
// });

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect(function (err) {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }
    
    console.log("Connection established");
});

module.exports = connection;
