const pool = require('../config/db');

/**
 * Paginated posts for a profile page, newest first, with each post's like
 * count and comment count attached (post likes/comments only - the joins
 * are strictly on posts.post_id, so quote/review likes never factor in).
 *
 * `visibilities` is the array of visibility tiers the viewer is allowed to
 * see, e.g. ['PUBLIC'] for a stranger, ['PUBLIC','PRIVATE'] for a friend,
 * or all three for the profile owner - see src/utils/visibility.js.
 *
 * `viewerId` is the logged-in viewer's user id (or null), used only to
 * compute `liked_by_me`.
 */
async function findByUserPaginated(userId, { limit = 3, offset = 0, visibilities = ['PUBLIC'], viewerId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT
        p.post_id,
        p.caption,
        p.visibility,
        p.created_at,
        COUNT(DISTINCT l.like_id)::int AS like_count,
        COALESCE(BOOL_OR(l.user_id = $5), false) AS liked_by_me,
        COUNT(DISTINCT c.comment_id)::int AS comment_count
     FROM posts p
     LEFT JOIN likes l ON l.post_id = p.post_id
     LEFT JOIN comments c ON c.post_id = p.post_id
     WHERE p.user_id = $1
       AND p.visibility = ANY($2::text[])
     GROUP BY p.post_id
     ORDER BY p.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, visibilities, limit, offset, viewerId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// POST /api/posts
// ---------------------------------------------------------------------------
async function create(userId, { caption, visibility }) {
  const { rows } = await pool.query(
    `INSERT INTO posts (user_id, caption, visibility)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, caption, visibility]
  );
  return rows[0];
}

// Single post, joined with like/comment stats - same shape as one row of
// findByUserPaginated, used to build the response right after creation, to
// check ownership before delete, and by likeController/commentController to
// confirm a post exists before acting on it.
async function findById(postId, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT
        p.post_id,
        p.user_id,
        p.caption,
        p.visibility,
        p.created_at,
        COUNT(DISTINCT l.like_id)::int AS like_count,
        COALESCE(BOOL_OR(l.user_id = $2), false) AS liked_by_me,
        COUNT(DISTINCT c.comment_id)::int AS comment_count
     FROM posts p
     LEFT JOIN likes l ON l.post_id = p.post_id
     LEFT JOIN comments c ON c.post_id = p.post_id
     WHERE p.post_id = $1
     GROUP BY p.post_id`,
    [postId, viewerId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// DELETE /api/posts/:postId
// Ownership is enforced in the query itself (user_id = $2) rather than as a
// separate check, so there's no window where "exists" and "belongs to you"
// could disagree.
// ---------------------------------------------------------------------------
async function deleteById(postId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM posts WHERE post_id = $1 AND user_id = $2 RETURNING post_id`,
    [postId, userId]
  );
  return rows[0] || null;
}

module.exports = { findByUserPaginated, create, findById, deleteById };