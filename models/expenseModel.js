const pool = require("../config/db");

const createExpensesTable = async () => {
  // First, delete any rows where the amount is 0

  // Now, create the table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_expense_entry UNIQUE (user_id, category)
    );
  `;
  await pool.query(createTableQuery);
  const deleteZeroAmountQuery = `
    DELETE FROM expenses
    WHERE amount = 0;
  `;
  await pool.query(deleteZeroAmountQuery);
};

module.exports = { createExpensesTable };
