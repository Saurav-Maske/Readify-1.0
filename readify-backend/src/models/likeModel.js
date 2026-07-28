const pool = require('../config/db');

// Generic like model shared by posts, quotes, and reviews. Exactly one of
// post_id/quote_id/review_id is ever set on a given row - enforced by the
// like_target_exactly_one CHECK constraint in the likes table itself - and
// each ON CONFLICT below targets the matching partial unique index
// (unique_post_like / unique_quote_like / unique_review_like) defined in
// src/db/schema/likes.schema.js, so liking something twice is a no-op
// rather than an error.

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
async function likePost(userId, postId) {
  const { rows } = await pool.query(
    `INSERT INTO likes (user_id, post_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, post_id) WHERE post_id IS NOT NULL DO NOTHING
     RETURNING like_id`,
    [userId, postId]
  );
  return rows[0] || null;
}

async function unlikePost(userId, postId) {
  const { rows } = await pool.query(
    `DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING like_id`,
    [userId, postId]
  );
  return rows[0] || null;
}

async function getPostLikeStats(postId, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT
        COUNT(*)::int AS like_count,
        COALESCE(BOOL_OR(user_id = $2), false) AS liked_by_me
     FROM likes WHERE post_id = $1`,
    [postId, viewerId]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------
async function likeQuote(userId, quoteId) {
  const { rows } = await pool.query(
    `INSERT INTO likes (user_id, quote_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, quote_id) WHERE quote_id IS NOT NULL DO NOTHING
     RETURNING like_id`,
    [userId, quoteId]
  );
  return rows[0] || null;
}

async function unlikeQuote(userId, quoteId) {
  const { rows } = await pool.query(
    `DELETE FROM likes WHERE user_id = $1 AND quote_id = $2 RETURNING like_id`,
    [userId, quoteId]
  );
  return rows[0] || null;
}

async function getQuoteLikeStats(quoteId, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT
        COUNT(*)::int AS like_count,
        COALESCE(BOOL_OR(user_id = $2), false) AS liked_by_me
     FROM likes WHERE quote_id = $1`,
    [quoteId, viewerId]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
async function likeReview(userId, reviewId) {
  const { rows } = await pool.query(
    `INSERT INTO likes (user_id, review_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, review_id) WHERE review_id IS NOT NULL DO NOTHING
     RETURNING like_id`,
    [userId, reviewId]
  );
  return rows[0] || null;
}

async function unlikeReview(userId, reviewId) {
  const { rows } = await pool.query(
    `DELETE FROM likes WHERE user_id = $1 AND review_id = $2 RETURNING like_id`,
    [userId, reviewId]
  );
  return rows[0] || null;
}

async function getReviewLikeStats(reviewId, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT
        COUNT(*)::int AS like_count,
        COALESCE(BOOL_OR(user_id = $2), false) AS liked_by_me
     FROM likes WHERE review_id = $1`,
    [reviewId, viewerId]
  );
  return rows[0];
}

module.exports = {
  likePost,
  unlikePost,
  getPostLikeStats,
  likeQuote,
  unlikeQuote,
  getQuoteLikeStats,
  likeReview,
  unlikeReview,
  getReviewLikeStats,
};