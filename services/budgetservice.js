// to check whether expenses run out of budget , if yes then notification sent through mail

const pool = require("../config/db");
const nodemailer = require("nodemailer");
require("dotenv").config();
       
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS, // Your email app password
    },
  });

const checkBudgetOverruns = async () => {
  try {
    // Query to get budgets where expenses exceed budget
    const query = `
      SELECT 
        b.user_id, 
        b.category, 
        b.budget_amount, 
        COALESCE(SUM(t.amount), 0) AS total_expense, 
        u.email
      FROM budget_goals b
      LEFT JOIN transactions t 
        ON b.user_id = t.user_id 
        AND b.category = t.category 
        AND t.type = 'expense'
      JOIN users u ON b.user_id = u.id
      WHERE b.notification_sent = FALSE  -- Only check users who haven't been notified
      GROUP BY b.user_id, b.category, b.budget_amount, u.email
      HAVING COALESCE(SUM(t.amount), 0) > b.budget_amount; -- Budget exceeded
    `;

    const result = await pool.query(query);

    for (const row of result.rows) {
      const { user_id, category, budget_amount, total_expense, email } = row;

      // Send Email Notification
      await sendBudgetOverrunEmail(email, category, budget_amount, total_expense);

      // Update notification_sent to TRUE to prevent duplicate notifications
      await pool.query(
        `UPDATE budget_goals SET notification_sent = TRUE WHERE user_id = $1 AND category = $2`,
        [user_id, category]
      );
    }
  } catch (error) {
    console.error("Error checking budget overruns:", error);
  }
};

const sendBudgetOverrunEmail = async (email, category, budget, expense) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Budget Overrun Alert for ${category}`,
      text: `You have exceeded your budget for ${category}.\nBudget: $${budget}\nSpent: $${expense}.`,
      html: `<p><strong>Budget Overrun Alert</strong></p>
             <p>You have exceeded your budget for <strong>${category}</strong>.</p>
             <p><strong>Budget:</strong> $${budget}</p>
             <p><strong>Spent:</strong> $${expense}</p>
             <p>Please review your expenses.</p>`,
    };
  
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Budget overrun email sent to ${email}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };
  module.exports = { checkBudgetOverruns, sendBudgetOverrunEmail };
  