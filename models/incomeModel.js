const pool = require("../config/db");

const createIncomeTable = async () => {

  // Now, create the table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS income (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      source VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_income_entry UNIQUE (user_id, source)
    );
  `;
  await pool.query(createTableQuery);
  const deleteZeroAmountQuery = `
    DELETE FROM income
    WHERE amount = 0;
  `;
  await pool.query(deleteZeroAmountQuery);
};

module.exports = { createIncomeTable };
