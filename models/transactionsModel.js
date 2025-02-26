const pool = require("../config/db");

const createTransactionsTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
        category VARCHAR(255),
        source VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(query);
  };
  

module.exports = { createTransactionsTable };
