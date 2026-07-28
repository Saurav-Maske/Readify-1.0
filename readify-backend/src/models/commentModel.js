const pool = require('../config/db');

// Comments on a post or a review. Exactly one of post_id/review_id is ever
// set on a given row - enforced by the comment_target_exactly_one CHECK
// constraint in the comments table itself (see
// src/db/schema/comments.schema.js). parent_comment_id supports one level
// (or more) of replies; the frontend builds the reply tree from the flat,
// oldest-first list returned by findByPost/findByReview.

async function createForPost(userId, postId, { comment, parentCommentId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO comments (post_id, user_id, parent_comment_id, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING comment_id`,
    [postId, userId, parentCommentId, comment]
  );
  return rows[0];
}

async function createForReview(userId, reviewId, { comment, parentCommentId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO comments (review_id, user_id, parent_comment_id, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING comment_id`,
    [reviewId, userId, parentCommentId, comment]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// GET /api/posts/:postId/comments
// Flat list, oldest first, with each commenter's display info joined in.
// ---------------------------------------------------------------------------
async function findByPost(postId) {
  const { rows } = await pool.query(
    `SELECT
        c.comment_id,
        c.parent_comment_id,
        c.comment,
        c.created_at,
        u.user_id,
        u.name,
        u.username,
        u.profile_picture
     FROM comments c
     JOIN users u ON u.user_id = c.user_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// GET /api/reviews/:reviewId/comments
// ---------------------------------------------------------------------------
async function findByReview(reviewId) {
  const { rows } = await pool.query(
    `SELECT
        c.comment_id,
        c.parent_comment_id,
        c.comment,
        c.created_at,
        u.user_id,
        u.name,
        u.username,
        u.profile_picture
     FROM comments c
     JOIN users u ON u.user_id = c.user_id
     WHERE c.review_id = $1
     ORDER BY c.created_at ASC`,
    [reviewId]
  );
  return rows;
}

// Single comment (with author info) - used to build the response right
// after creation without re-shaping req.user by hand.
async function findById(commentId) {
  const { rows } = await pool.query(
    `SELECT
        c.comment_id,
        c.parent_comment_id,
        c.comment,
        c.created_at,
        u.user_id,
        u.name,
        u.username,
        u.profile_picture
     FROM comments c
     JOIN users u ON u.user_id = c.user_id
     WHERE c.comment_id = $1`,
    [commentId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// DELETE /api/comments/:commentId   (protected, requireAuth)
// Ownership enforced in the query itself, same pattern as
// postModel.deleteById / quoteModel.deleteById / reviewModel.deleteById.
// ---------------------------------------------------------------------------
async function deleteById(commentId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM comments WHERE comment_id = $1 AND user_id = $2 RETURNING comment_id`,
    [commentId, userId]
  );
  return rows[0] || null;
}

module.exports = {
  createForPost,
  createForReview,
  findByPost,
  findByReview,
  findById,
  deleteById,
};