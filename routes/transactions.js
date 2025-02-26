const express = require("express");
const { addTransaction, getTransactions, updateTransaction, deleteTransaction } = require("../controllers/transactionController");
const authenticateJWT = require("../middleware/authJWT");
const getBalance = require("../controllers/getBalance");
const pool = require("../config/db");

const router = express.Router();

router.post("/", authenticateJWT, addTransaction);
router.get("/", authenticateJWT, getTransactions);
router.post("/:id/edit", authenticateJWT, updateTransaction);
router.get("/:id/delete", authenticateJWT, deleteTransaction);

router.get("/add",authenticateJWT,(req,res)=>{
    res.render("tranxadd");
})

router.get("/:id/edit", authenticateJWT, async (req, res) => {
    const {id}  = req.params;
    try {
        const result = await pool.query("SELECT * FROM transactions WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).send("Transaction not found");
        }
        res.render("tranxedit", { transaction: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching transaction");
    }
});


module.exports = router;
