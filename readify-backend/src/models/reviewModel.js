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

/**
 * `viewerId` is the logged-in viewer's user id (or null), used only to
 * compute `liked_by_me`.
 */
async function findByUserPaginated(userId, { limit = 3, offset = 0, viewerId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT
        r.review_id,
        r.rating,
        r.review,
        r.created_at,
        r.book_id,
        b.title AS book_title,
        b.author AS book_author,
        b.cover_image AS book_cover_image,
        b.rating AS book_rating,
        b.no_of_ratings AS book_no_of_ratings,
        COUNT(DISTINCT l.like_id)::int AS like_count,
        COALESCE(BOOL_OR(l.user_id = $4), false) AS liked_by_me,
        COUNT(DISTINCT c.comment_id)::int AS comment_count
     FROM reviews r
     JOIN books b ON b.book_id = r.book_id
     LEFT JOIN likes l ON l.review_id = r.review_id
     LEFT JOIN comments c ON c.review_id = r.review_id
     WHERE r.user_id = $1
     GROUP BY r.review_id, b.book_id
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset, viewerId]
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

// Single review, joined with book + like/comment stats - used to build the
// response right after creation, to check ownership before delete, and by
// likeController/commentController to confirm a review exists before acting
// on it.
async function findById(reviewId, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT
        r.review_id,
        r.user_id,
        r.rating,
        r.review,
        r.created_at,
        r.book_id,
        b.title AS book_title,
        b.author AS book_author,
        b.cover_image AS book_cover_image,
        b.rating AS book_rating,
        b.no_of_ratings AS book_no_of_ratings,
        COUNT(DISTINCT l.like_id)::int AS like_count,
        COALESCE(BOOL_OR(l.user_id = $2), false) AS liked_by_me,
        COUNT(DISTINCT c.comment_id)::int AS comment_count
     FROM reviews r
     JOIN books b ON b.book_id = r.book_id
     LEFT JOIN likes l ON l.review_id = r.review_id
     LEFT JOIN comments c ON c.review_id = r.review_id
     WHERE r.review_id = $1
     GROUP BY r.review_id, b.book_id`,
    [reviewId, viewerId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// DELETE /api/reviews/:reviewId
// Ownership enforced in the query itself, same reasoning as postModel.deleteById.
// ---------------------------------------------------------------------------
async function deleteById(reviewId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM reviews WHERE review_id = $1 AND user_id = $2 RETURNING review_id, book_id`,
    [reviewId, userId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// GET /api/books/:bookId/reviews
// Community reviews for a single book (always public), newest first, with
// the reviewer's own display info attached - separate from
// findByUserPaginated, which goes the other way (one user's reviews across
// every book, for the profile page).
// ---------------------------------------------------------------------------
async function findByBookPaginated(bookId, { limit = 10, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT
        r.review_id,
        r.rating,
        r.review,
        r.created_at,
        u.user_id AS reviewer_id,
        u.name AS reviewer_name,
        u.username AS reviewer_username,
        u.profile_picture AS reviewer_avatar
     FROM reviews r
     JOIN users u ON u.user_id = r.user_id
     WHERE r.book_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [bookId, limit, offset]
  );
  return rows;
}

module.exports = { countByUser, findByUserPaginated, findByBookPaginated, create, findById, deleteById };