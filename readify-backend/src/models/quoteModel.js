const pool = require('../config/db');

/**
 * Recent quotes for a profile page, newest first, with each quote's like
 * count and whether the viewer has liked it attached.
 *
 * Unlike posts, quotes have no visibility tiers of their own - access is
 * gated purely by relationship (self/friend/stranger) in profileController,
 * before this ever runs. So there is no `visibilities` filter here.
 *
 * `viewerId` is the logged-in viewer's user id (or null for a logged-out
 * visitor / when nobody has liked anything yet), used only to compute
 * `liked_by_me`.
 */
async function findRecentByUser(userId, { limit = 3, viewerId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT
        q.quote_id,
        q.quote,
        q.created_at,
        COUNT(l.like_id)::int AS like_count,
        COALESCE(BOOL_OR(l.user_id = $3), false) AS liked_by_me
     FROM quotes q
     LEFT JOIN likes l ON l.quote_id = q.quote_id
     WHERE q.user_id = $1
     GROUP BY q.quote_id
     ORDER BY q.created_at DESC
     LIMIT $2`,
    [userId, limit, viewerId]
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

// Single quote, joined with its like stats - used to build the response
// right after creation and to check ownership before delete.
async function findById(quoteId, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT
        q.quote_id,
        q.user_id,
        q.quote,
        q.created_at,
        COUNT(l.like_id)::int AS like_count,
        COALESCE(BOOL_OR(l.user_id = $2), false) AS liked_by_me
     FROM quotes q
     LEFT JOIN likes l ON l.quote_id = q.quote_id
     WHERE q.quote_id = $1
     GROUP BY q.quote_id`,
    [quoteId, viewerId]
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