var mysql = require("mysql");
const util = require("util");

const dbParams = {
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "work_manager",
};

const db = mysql.createConnection(dbParams);
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

const queryAsync = util.promisify(db.query).bind(db);

module.exports = {
  db,
  queryAsync,
};