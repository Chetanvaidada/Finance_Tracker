const express = require("express");
const app = express();
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken"); 
const authenticateJWT = require("./middleware/authJWT");
const cookieParser = require("cookie-parser");
const pool = require("./config/db");
const cron = require("node-cron");
const {getBalance,getIncome,getExpense} = require("./controllers/getBalance");
const {getIncomeStats,getExpenseStats} = require("./controllers/statscalc");
const { checkBudgetOverruns } = require("./services/budgetservice");
const { addTransaction, getTransactions, updateTransaction, deleteTransaction } = require("./controllers/transactionController");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
app.use(cookieParser());
const path = require("path");
app.set("views", path.join(__dirname, "views")); 
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use(express.static('public'));

require("./models/userModel").createUserTable(); 
require("./models/expenseModel").createExpensesTable(); 
require("./models/incomeModel").createIncomeTable();
require("./models/transactionsModel").createTransactionsTable();
require("./models/budget").createBudgetTable();
require("./models/splitmodel").createSplitsTable();


app.get("/",(req,res) =>{
    res.render("login");
});

app.use("/auth", require("./routes/auth")); //router for authentication through google
app.use("/user", require("./routes/user"));  // router for normal authentication 
app.use("/transactions",require("./routes/transactions")); // router for transactions (create,edit,delete)
app.use("/budget",require("./routes/budgetemail")); // router for budget email (notification)
app.use("/split",require("./routes/splits")); // router for expense sharing
  

//main page after login
app.get("/mainPage",authenticateJWT,async (req,res) =>{
    try {

      const user_id = req.user.id;
      const balance = await getBalance(user_id);
      const totalIncome = await getIncome(user_id);
      const totalExpense = await getExpense(user_id);
     const transactions = await getTransactions(user_id);

     const user = await pool.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
    res.render("main", {
      name: user.rows[0].name, 
      totalIncome : totalIncome,
      totalExpense : totalExpense,
      balance: balance,
      transactions: transactions
    });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

//Reporting (monthly)
app.get("/monthly-analysis",authenticateJWT,async (req,res) =>{
    try {
        const user_id = req.user.id;
        const reportQuery = `
            SELECT 
                TO_CHAR(date, 'YYYY-MM') AS month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
            FROM transactions
            WHERE user_id = $1
            GROUP BY month
            ORDER BY month DESC;
        `;
        const result = await pool.query(reportQuery, [user_id]);

        res.render('monthlyanalysis', { reportData: result.rows });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('Internal Server Error');
    }
});

//statistics Income and expense wise including budget integration
app.get("/statistics",authenticateJWT,async (req,res) =>{
    try {

        const user_id = req.user.id;
        const totalIncome = await getIncomeStats(user_id);
        const totalExpense = await getExpenseStats(user_id);

        const budgetQuery = `
    SELECT category, budget_amount
    FROM budget_goals
    WHERE user_id = $1
  `;
  const budgetResult = await pool.query(budgetQuery, [user_id]);
  
      res.render("stats", {
        income: totalIncome,
        expenses: totalExpense,
        budgets: budgetResult.rows
      });
      } catch (error) {
          console.error(error);
          res.status(500).send("Internal Server Error");
      }
});

app.post('/setbudget', authenticateJWT, async (req, res) => {
    const { category, budget } = req.body;
    const user_id = req.user.id;

    try {
        // Check if the category exists in the expenses table
        const checkCategoryQuery = `SELECT 1 FROM expenses WHERE user_id = $1 AND category = $2 LIMIT 1`;
        const categoryExists = await pool.query(checkCategoryQuery, [user_id, category]);

        // If category does not exist, send a warning message
        if (categoryExists.rowCount === 0) {
            const user_id = req.user.id;
        const totalIncome = await getIncomeStats(user_id);
        const totalExpense = await getExpenseStats(user_id);

        const budgetQuery = `
    SELECT category, budget_amount
    FROM budget_goals
    WHERE user_id = $1
  `;
  const budgetResult = await pool.query(budgetQuery, [user_id]);
            return res.render('stats', {
                error: `The category "${category}" is not found in your expenses. Please add an expense first.`,
                // Pass other necessary data to the view (e.g., income, expenses)
                income: totalIncome,
                expenses: totalExpense,
                budgets: budgetResult.rows
            });
        }

        // Insert or update the budget goal
        const insertQuery = `
            INSERT INTO budget_goals (user_id, category, budget_amount)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, category)
            DO UPDATE SET budget_amount = EXCLUDED.budget_amount;
        `;
        await pool.query(insertQuery, [user_id, category, budget]);     

        // Redirect to the statistics page
        res.redirect('/statistics');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


//budget check for every hour 
cron.schedule("0 * * * *", async () => {
    console.log("Checking for budget overruns...");
    await checkBudgetOverruns();
    console.log("Budget check completed.");
  });

app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
})