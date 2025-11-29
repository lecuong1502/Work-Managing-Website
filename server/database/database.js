import { createConnection } from "mysql2";
import { promisify } from "util";
import dotenv from "dotenv";
dotenv.config();

const dbParams = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

const db = createConnection(dbParams);
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

const queryAsync = promisify(db.query).bind(db);

async function fetchAndLogUsers() {
  try {
    const result = await queryAsync('SELECT * FROM users');
    console.log(result);
  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    db.end();
  }
}
fetchAndLogUsers();

export {
  db,
  queryAsync,
};