const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
  max: 1
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

module.exports = pool;