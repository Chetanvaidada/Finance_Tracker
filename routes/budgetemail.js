const express = require("express");
const { checkBudgetOverruns, sendBudgetOverrunEmail } = require("../services/budgetservice");

const router = express.Router();

// just for testing purpose
router.get("/test-email", async (req, res) => {
  try {
    
    await sendBudgetOverrunEmail("112115169@cse.iiitp.ac.in", "Food", 500, 600);
    res.send("Test email sent successfully!");
  } catch (error) {
    res.status(500).send("Error sending test email");
  }
});

module.exports = router;
