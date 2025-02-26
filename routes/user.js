const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const jwt = require('jsonwebtoken'); 
const authenticateJWT = require("../middleware/authJWT");
const {getBalance,getIncome,getExpense} = require("../controllers/getBalance");
const { addTransaction, getTransactions, updateTransaction, deleteTransaction } = require("../controllers/transactionController");

// Login Page
router.get("/login", (req, res) => res.render("login"));

// Register Page
router.get("/register", (req, res) => res.render("register"));


router.get("/profile", authenticateJWT, async (req, res) => {
    try {
        const email = req.user.email; // Extract user ID from JWT

        // Fetch user details from database
        let result = await pool.query("SELECT name, email FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            result = await pool.query("SELECT name, email FROM google_users WHERE email = $1", [email]);
            if (result.rows.length === 0) {
                return res.status(404).send("User not found");
            }
    
        }

        const user = result.rows[0]; 
        
        res.render("profile", { user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.render("login", { message: "Invalid email or password!" });

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.render("login", { message: "Invalid email or password!" });

        const token = jwt.sign({ id: user.rows[0].id, email: user.rows[0].email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
        res.cookie("token", token, { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 });

         const user_id = user.rows[0].id;
              const balance = await getBalance(user_id);
             const transactions = await getTransactions(user_id);
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
        console.error(error);
        res.render("login", { message: "Server error. Please try again!" });
    }
});

// Handle User Registration
router.post(
    "/register",
    [body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")],
    async (req, res) => {
        const { name, email, password } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.render("register", { message: errors.array()[0].msg });

        try {
            let existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            if (existingUser.rows.length > 0) return res.render("register", { message: "Email is already registered!" });
            
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                "INSERT INTO users (name, email, password, provider) VALUES ($1, $2, $3, 'local')",
                [name, email, hashedPassword]
              );
              
            res.render("login", { message: "Registration successful! ✅" });
        } catch (error) {
            console.error(error);
            res.render("register", { message: "Server error. Please try again!" });
        }
    }
);

router.get("/edit", authenticateJWT, async (req, res) => {
    try {
        const email = req.user.email;
        const result = await pool.query("SELECT name, email FROM users WHERE email = $1", [email]);

            if (result.rows.length === 0) {
                return res.status(404).send("User not found");
            }

        const user = result.rows[0]; 
        
        res.render("edit_profile", { user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/edit", authenticateJWT, async (req, res) => {
    try {
        const email = req.user.email; 
        const { name, password } = req.body;

        let User = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

  
            let query = "UPDATE users SET name = $1 WHERE email = $2";
            let values = [name, email];
    
            // If password is provided, update it
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query = "UPDATE users SET name = $1, password = $2 WHERE email = $3";
                values = [name, hashedPassword, email];
            }
    
            await pool.query(query, values);

        res.clearCookie("token");
        res.redirect("/user/login");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/user/login");
});

module.exports = router;
