const mysql = require('mysql');

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ahead"
});

connection.connect(function (err) {
    if (err) throw err;
    console.log("Connection established");
});

module.exports = connection;
