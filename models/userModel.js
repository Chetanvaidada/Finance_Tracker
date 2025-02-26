const pool = require("../config/db");

const createUserTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255), 
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255), -- NULL for Google users
      google_id VARCHAR(255) UNIQUE, -- NULL for normal users
      provider VARCHAR(50) CHECK (provider IN ('local', 'google')) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await pool.query(query);
};

module.exports = { createUserTable };
