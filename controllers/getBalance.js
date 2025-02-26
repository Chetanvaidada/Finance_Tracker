const pool = require("../config/db");


const getBalance = async (user_id) => {
  try {
    const query = `SELECT 
          COALESCE(SUM(i.total_income), 0) - COALESCE(SUM(e.total_expense), 0) AS balance
      FROM 
          (SELECT user_id, SUM(amount) AS total_income FROM income WHERE user_id = $1 GROUP BY user_id) i
      FULL JOIN 
          (SELECT user_id, SUM(amount) AS total_expense FROM expenses WHERE user_id = $1 GROUP BY user_id) e
      ON i.user_id = e.user_id`;

    const balanceResult = await pool.query(query, [user_id]);
    return balanceResult.rows[0].balance;
  } catch (error) {
    throw new Error("Error fetching balance");
  }
};

const getIncome = async (user_id) => {
  try {
    const incomeQuery = `SELECT COALESCE(SUM(amount), 0) sum FROM income WHERE user_id = $1`;

    const IncomeResult = await pool.query(incomeQuery, [user_id]);
    return IncomeResult.rows[0].sum;
  } catch (error) {
    throw new Error("Error fetching Income");
  }
};

const getExpense = async (user_id) => {
  try {
    const expenseQuery = `SELECT COALESCE(SUM(amount), 0) sum FROM expenses WHERE user_id = $1;`;

    const ExpenseResult = await pool.query(expenseQuery, [user_id]);
    return ExpenseResult.rows[0].sum;
  } catch (error) {
    throw new Error("Error fetching Expense");
  }
};

module.exports = {getBalance,getIncome,getExpense} ;
