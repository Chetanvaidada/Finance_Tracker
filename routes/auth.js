const express = require("express");
const passport = require("passport");
const router = express.Router();
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../config/db");
const jwt = require('jsonwebtoken'); 
const {getBalance,getIncome,getExpense} = require("../controllers/getBalance");
const { getTransactions } = require("../controllers/transactionController");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `http://localhost:${PORT}/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const { id, displayName, emails } = profile;
                const email = emails[0].value;
                const userQuery = "SELECT * FROM users WHERE email = $1";
                const userResult = await pool.query(userQuery, [email]);

                let user;
                if (userResult.rows.length === 0) {
                    const newUser = await pool.query(
                        "INSERT INTO users (google_id,name, email,provider) VALUES ($1, $2,$3,'google') RETURNING *",
                        [id,displayName, email]
                    );
                    console.log("✅ New Google user created:", newUser.rows[0]);
                    user = newUser.rows[0];
                } else {
                    console.log("🔄 User already exists:", userResult.rows[0]);
                    user = userResult.rows[0];
                }
                const token = jwt.sign(
                    { id: user.id, email: user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRY }
                );
                return done(null, { user, token }); 
            } catch (error) {
                console.error("❌ Database Error:", error);
                return done(error, null);
            }
        }
    )
);

// Google OAuth Routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/", session: false }),
   async (req, res) => {
        res.cookie("token", req.user.token, {
            httpOnly: true,
            secure: true, // Set true in production with HTTPS
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        const user_id = req.user.user.id;

    const balance = await getBalance(user_id);
    const transactions = await getTransactions(user_id);
    const totalIncome = await getIncome(user_id);
      const totalExpense = await getExpense(user_id);
        
    // Pass balance and transactions to the view
    res.render("main", {
      name: req.user.user.name,
      totalIncome : totalIncome,
      totalExpense : totalExpense,  
      balance: balance,
      transactions: transactions
    });
    }
);

module.exports = router;
