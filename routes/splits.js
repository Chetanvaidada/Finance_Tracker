const pool = require("../config/db");
const express = require("express");
const router = express.Router();
const {getOwedToOthers,getOwedToMe} = require("../controllers/getSplit");
const authenticateJWT = require("../middleware/authJWT");


router.post("/create", authenticateJWT, async (req, res) => {
    try {
        const { recipient_id, amount } = req.body;
        const payer_id = req.user.id;

        if (!recipient_id || !amount || amount <= 0) {
            return res.status(400).send("Invalid recipient or amount.");
        }

        // Insert into expense_shares
        const insertQuery = `
            INSERT INTO expense_shares (owed_to, owed_by, amount, settled)
            VALUES ($1, $2, $3, 'no');
        `;
        await pool.query(insertQuery, [payer_id, recipient_id, amount]);

        res.redirect("/split/"); // Redirect to the dashboard
    } catch (error) {
        console.error("Error creating expense split:", error);
        res.status(500).send("Error creating expense split.");
    }
});

router.post("/settle", authenticateJWT, async (req, res) => {
    const { recipient_id,share_id } = req.body;
    const user_id = req.user.id;

    try {
        // Get expense details
        const result = await pool.query(`
            SELECT * FROM expense_shares WHERE id = $1
        `, [share_id]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or already settled share" });
        }

        const amount = result.rows[0].amount;

        // Record payment as an expense
        await pool.query(`
            INSERT INTO transactions (user_id, type, category, amount)
            VALUES ($1, 'expense', 'Shared Expense Payment', $2)
        `, [user_id, amount]);

        // Record received amount as income
        await pool.query(`
            INSERT INTO transactions (user_id, type, category, amount)
            VALUES ($1, 'income', 'Shared Expense Received', $2)
        `, [recipient_id, amount]);

        await pool.query(
            `INSERT INTO expenses (user_id, category, amount)
             VALUES ($1, 'Shared expense Debit', $2)
             ON CONFLICT (user_id, category) 
             DO UPDATE SET amount = expenses.amount + EXCLUDED.amount`,
            [user_id, amount]
        );

        await pool.query(
            `INSERT INTO income (user_id, source, amount)
             VALUES ($1, 'Shared expense Credit', $2)
             ON CONFLICT (user_id, source) 
             DO UPDATE SET amount = income.amount + EXCLUDED.amount`,
            [recipient_id, amount]
        );

        // Mark share as settled
        await pool.query(`UPDATE expense_shares SET settled = 'yes' WHERE id = $1`, [share_id]);

        res.redirect("/split/"); // Redirect to the dashboard
    } catch (error) {
        console.error("Error settling expense:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/",authenticateJWT,async (req,res)=>{
    try{
        const user_id = req.user.id;
    
        let toMe = await getOwedToMe(user_id);
        let byMe =  await getOwedToOthers(user_id);

        let users = await pool.query("SELECT id, name FROM users WHERE id != $1; ",[req.user.id]) || [];
        res.render("splits",{
            toMe : toMe,
            byMe : byMe,
            users : users.rows
        });
    }catch(error){
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;


