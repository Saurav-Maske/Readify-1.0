const pool = require('../config/db');
 
// Reviews have no visibility tiers - a review is essentially a post with a
// rating attached, and is always public. 
async function countByUser(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM reviews WHERE user_id = $1',
    [userId]
  );
  return rows[0].count;
}
 
async function findByUserPaginated(userId, { limit = 3, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT
        r.review_id,
        r.rating,
        r.review,
        r.created_at,
        r.book_id,
        b.title AS book_title,
        b.author AS book_author
     FROM reviews r
     JOIN books b ON b.book_id = r.book_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}
 
// ---------------------------------------------------------------------------
// POST /api/reviews
// ---------------------------------------------------------------------------
async function create(userId, { bookId, rating, review }) {
  const { rows } = await pool.query(
    `INSERT INTO reviews (user_id, book_id, rating, review)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, bookId, rating, review]
  );
  return rows[0];
}

// Single review, joined with book - used to build the response right after
// creation and to check ownership before delete.
async function findById(reviewId) {
  const { rows } = await pool.query(
    `SELECT
        r.review_id,
        r.user_id,
        r.rating,
        r.review,
        r.created_at,
        r.book_id,
        b.title AS book_title,
        b.author AS book_author
     FROM reviews r
     JOIN books b ON b.book_id = r.book_id
     WHERE r.review_id = $1`,
    [reviewId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// DELETE /api/reviews/:reviewId
// Ownership enforced in the query itself, same reasoning as postModel.deleteById.
// ---------------------------------------------------------------------------
async function deleteById(reviewId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM reviews WHERE review_id = $1 AND user_id = $2 RETURNING review_id`,
    [reviewId, userId]
  );
  return rows[0] || null;
}

module.exports = { countByUser, findByUserPaginated, create, findById, deleteById };