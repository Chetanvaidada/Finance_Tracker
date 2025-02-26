const pool = require("../config/db");

const createSplitsTable = async () => {

  // Now, create the table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS expense_shares (
    id SERIAL PRIMARY KEY,
    expense_id INT REFERENCES transactions(id) ON DELETE CASCADE,
    owed_to INT REFERENCES users(id) ON DELETE CASCADE,
    owed_by INT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    settled VARCHAR(20) CHECK (settled IN ('yes', 'no')) DEFAULT 'no',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `;
  await pool.query(createTableQuery);
};

module.exports = { createSplitsTable };
