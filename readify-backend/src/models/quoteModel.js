const pool = require('../config/db');

/**
 * Recent quotes for a profile page, newest first, joined with the book's
 * title/author.
 *
 * `visibilities` is the array of visibility tiers the viewer is allowed to
 * see - see src/utils/visibility.js.
 */
async function findRecentByUser(userId, { limit = 3, visibilities = ['PUBLIC'] } = {}) {
  const { rows } = await pool.query(
    `SELECT
        q.quote_id,
        q.quote,
        q.visibility,
        q.created_at
     FROM quotes q
     WHERE q.user_id = $1
       AND q.visibility = ANY($2::text[])
     ORDER BY q.created_at DESC
     LIMIT $3`,
    [userId, visibilities, limit]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// POST /api/quotes
// ---------------------------------------------------------------------------
async function create(userId, { quote }) {
  const { rows } = await pool.query(
    `INSERT INTO quotes (user_id, quote)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, quote]
  );
  return rows[0];
}

// Single quote, joined with book - used to build the response right after
// creation and to check ownership before delete.
async function findById(quoteId) {
  const { rows } = await pool.query(
    `SELECT
        q.quote_id,
        q.user_id,
        q.quote,
        q.visibility,
        q.created_at
     FROM quotes q
     WHERE q.quote_id = $1`,
    [quoteId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// DELETE /api/quotes/:quoteId
// Ownership enforced in the query itself, same reasoning as
// postModel.deleteById / reviewModel.deleteById.
// ---------------------------------------------------------------------------
async function deleteById(quoteId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM quotes WHERE quote_id = $1 AND user_id = $2 RETURNING quote_id`,
    [quoteId, userId]
  );
  return rows[0] || null;
}

module.exports = { findRecentByUser, create, findById, deleteById };