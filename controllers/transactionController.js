const pool = require("../config/db");
const {getBalance,getIncome,getExpense} = require("../controllers/getBalance");

const addTransaction = async (req, res) => {
  try {
      const { source, category, amount, date, type } = req.body;
      const user_id = req.user.id;


      // Determine type if missing
      let transactionType = type;
      if (!type) {
          transactionType = source ? "income" : "expense"; // Default type based on input
      }

      // Validate required fields
      if (!amount) {
          console.log("Missing fields detected:", { amount });
          return res.status(400).json({ error: "Missing required fields" });
      }

      // Insert into transactions table
      const transactionQuery = `
          INSERT INTO transactions (user_id, type, amount, source, category, date)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`;
      
      const transactionValues = [user_id, transactionType, amount, source || null, category || null, date || new Date()];

      await pool.query(transactionQuery, transactionValues);

      // Update income or expense table accordingly
      if (transactionType === "income") {
          await pool.query(
              `INSERT INTO income (user_id, source, amount)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, source) 
               DO UPDATE SET amount = income.amount + EXCLUDED.amount`,
              [user_id, source, amount]
          );
      } else if (transactionType === "expense") {
          await pool.query(
              `INSERT INTO expenses (user_id, category, amount)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, category) 
               DO UPDATE SET amount = expenses.amount + EXCLUDED.amount`,
              [user_id, category, amount]
          );
      }

      const balance = await getBalance(user_id);
      const transactions = await getTransactions(user_id);
      const user = await pool.query("SELECT * FROM users WHERE email = $1", [req.user.email]);  
      const totalIncome = await getIncome(user_id);
      const totalExpense = await getExpense(user_id);

      res.render("main", {
        name: user.rows[0].name, 
        totalIncome : totalIncome,
      totalExpense : totalExpense,
        balance: balance,
        transactions: transactions
      });

  } catch (error) {
      throw error;
  }
};



const getTransactions = async (user_id) => { // Accept user_id as a parameter
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC",
      [user_id]
    );
    return result.rows; // Return the rows containing transactions
  } catch (error) {
    throw new Error("Error fetching transactions"); // Throw error if something goes wrong
  }
};

  const updateTransaction = async (req, res) => {
    const { id } = req.params;
    let { type, category, source, amount, date } = req.body;

    if (!type) {
        type = source ? "income" : "expense"; // Default type based on input
    }

    try {
        // Fetch the existing transaction details
        const oldTransaction = await pool.query("SELECT * FROM transactions WHERE id = $1", [id]);
        if (oldTransaction.rows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const oldType = oldTransaction.rows[0].type;
        const oldAmount = oldTransaction.rows[0].amount;
        const oldSource = oldTransaction.rows[0].source;
        const oldCategory = oldTransaction.rows[0].category;

        // Update the transactions table
        const transactionResult = await pool.query(
            `UPDATE transactions 
             SET type = $1, category = $2, source = $3, amount = $4, date = $5
             WHERE id = $6 RETURNING *`,
            [type, category, source, amount,  date, id]
        );

        if (oldType === "income") {
            // Subtract old amount from income table
            await pool.query(
                `UPDATE income SET amount = amount - $1 WHERE user_id = $2 AND source = $3`,
                [oldAmount, req.user.id, oldSource]
            );
        } else if (oldType === "expense") {
            // Subtract old amount from expense table
            await pool.query(
                `UPDATE expenses SET amount = amount - $1 WHERE user_id = $2 AND category = $3`,
                [oldAmount, req.user.id, oldCategory]
            );
        }

        if (type === "income") {
            await pool.query(
                `INSERT INTO income (user_id, source, amount)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, source) 
                 DO UPDATE SET amount = income.amount + EXCLUDED.amount`,
                [req.user.id, source, amount]
            );
        } else if (type === "expense") {
            await pool.query(
                `INSERT INTO expenses (user_id, category, amount)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, category) 
                 DO UPDATE SET amount = expenses.amount + EXCLUDED.amount`,
                [req.user.id, category, amount]
            );
        }

        const user_id = req.user.id;
        const balance = await getBalance(user_id);
        const transactions = await getTransactions(user_id);
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
        const totalIncome = await getIncome(user_id);
        const totalExpense = await getExpense(user_id);

      res.render("main", {
        name: user.rows[0].name, 
        totalIncome : totalIncome,
      totalExpense : totalExpense,
        balance: balance,
        transactions: transactions
      });
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ error: "Error updating transaction" });
    }
};


  

  const deleteTransaction = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Fetch the existing transaction details
      const oldTransaction = await pool.query("SELECT * FROM transactions WHERE id = $1", [id]);
      if (oldTransaction.rows.length === 0) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      const oldType = oldTransaction.rows[0].type;
      const oldAmount = oldTransaction.rows[0].amount;
      const oldSource = oldTransaction.rows[0].source;
      const oldCategory = oldTransaction.rows[0].category;
  
      // Delete transaction from transactions table
      await pool.query("DELETE FROM transactions WHERE id = $1", [id]);
  
      if (oldType === "income") {
        // Deduct from income table
        await pool.query(
          `UPDATE income SET amount = amount - $1 WHERE user_id = $2 AND source = $3`,
          [oldAmount, req.user.id, oldSource]
        );
      } else if (oldType === "expense") {
        // Deduct from expense table
        await pool.query(
          `UPDATE expenses SET amount = amount - $1 WHERE user_id = $2 AND category = $3`,
          [oldAmount, req.user.id, oldCategory]
        );
      }
  
      const user_id = req.user.id;
        const balance = await getBalance(user_id);
        const transactions = await getTransactions(user_id);

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
        const totalIncome = await getIncome(user_id);
      const totalExpense = await getExpense(user_id);

      res.render("main", {
        name: user.rows[0].name, 
        totalIncome : totalIncome,
      totalExpense : totalExpense,
        balance: balance,
        transactions: transactions
      });
    } catch (error) {
      res.status(500).json({ error: "Error deleting transaction" });
    }
  };
  

  module.exports = {addTransaction,getTransactions,updateTransaction,deleteTransaction};
  