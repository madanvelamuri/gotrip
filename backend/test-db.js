import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

try {
  const result = await pool.query("SELECT NOW()");

  console.log("=================================");
  console.log("DATABASE CONNECTION SUCCESS");
  console.log("Database time:", result.rows[0].now);
  console.log("=================================");

} catch (error) {

  console.error("=================================");
  console.error("DATABASE CONNECTION FAILED");
  console.error(error.message);
  console.error("=================================");

} finally {

  await pool.end();

}