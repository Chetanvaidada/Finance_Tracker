const pool = require("../config/db");

const createBudgetTable = async () => {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS budget_goals (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  budget_amount DECIMAL(10, 2) NOT NULL,
  date_set TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notification_sent BOOLEAN DEFAULT FALSE, -- Tracks if an alert was sent
  CONSTRAINT unique_budget_goal UNIQUE (user_id, category)
);
  `;
  await pool.query(createTableQuery);
};

module.exports = { createBudgetTable };
