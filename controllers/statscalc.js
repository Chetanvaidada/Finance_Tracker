const pool = require("../config/db");

const getIncomeStats = async (user_id) => {
    try {
        const deleteZeroAmountQuery = `
    DELETE FROM income
    WHERE amount = 0;
  `;
  await pool.query(deleteZeroAmountQuery);
      const incomeQuery = `SELECT 
        source,
        SUM(amount) AS sum
    FROM 
        income
    WHERE 
        user_id = $1
    GROUP BY 
        user_id, 
        source
    ORDER BY 
        sum DESC; `;
  
      const IncomeResult = await pool.query(incomeQuery, [user_id]);
      return IncomeResult.rows;
    } catch (error) {
      throw new Error("Error fetching Income");
    }
  };
  
  const getExpenseStats = async (user_id) => {
    try {
        const deleteZeroAmountQuery = `
    DELETE FROM expenses
    WHERE amount = 0;
  `;
  await pool.query(deleteZeroAmountQuery);
      const expenseQuery = `SELECT 
        category,
        SUM(amount) AS sum
    FROM 
        expenses
    WHERE 
        user_id = $1
    GROUP BY 
        user_id, 
        category
    ORDER BY 
        sum DESC;`;
  
      const ExpenseResult = await pool.query(expenseQuery, [user_id]);
      return ExpenseResult.rows;
    } catch (error) {
      throw new Error("Error fetching Expense");
    }
  };
  module.exports = {getIncomeStats,getExpenseStats};