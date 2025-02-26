const pool = require("../config/db");
const getOwedToOthers = async (user_id) => {
  try {
    const owedToOthersQuery = `
      SELECT es.id AS share_id, es.owed_by AS user_id, u.name AS name, es.amount  AS amount
    FROM expense_shares es
    JOIN users u ON es.owed_to = u.id
    WHERE es.owed_by = $1 AND es.settled = 'no';
    `;
    const owedToOthers = await pool.query(owedToOthersQuery, [user_id]);
    return owedToOthers.rows.length ? owedToOthers.rows : [];
  } catch (error) {
    throw new Error("Error fetching owed by me");
  }
};

const getOwedToMe = async (user_id) => {
  try {
    const owedToMeQuery = `
      SELECT es.id AS share_id, es.owed_by AS user_id, u.name AS name, es.amount AS amount
    FROM expense_shares es
    JOIN users u ON es.owed_by = u.id
    WHERE es.owed_to = $1 AND es.settled = 'no';
    `;
    const owedToMe = await pool.query(owedToMeQuery, [user_id]);
    return owedToMe.rows.length ? owedToMe.rows : [];
  } catch (error) {
    throw new Error("Error fetching Owed to me");
  }
};

module.exports = {getOwedToOthers,getOwedToMe} ;
