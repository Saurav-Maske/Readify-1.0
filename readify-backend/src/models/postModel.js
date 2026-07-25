const pool = require('../config/db');

/**
 * Paginated posts for a profile page, newest first, with each post's like
 * count attached (post likes only - the join is strictly on
 * posts.post_id = likes.post_id, so quote likes never factor in). Comments
 * are intentionally not included.
 *
 * `visibilities` is the array of visibility tiers the viewer is allowed to
 * see, e.g. ['PUBLIC'] for a stranger, ['PUBLIC','PRIVATE'] for a friend,
 * or all three for the profile owner - see src/utils/visibility.js.
 */
async function findByUserPaginated(userId, { limit = 3, offset = 0, visibilities = ['PUBLIC'] } = {}) {
  const { rows } = await pool.query(
    `SELECT
        p.post_id,
        p.caption,
        p.visibility,
        p.created_at,
        p.book_id,
        b.title AS book_title,
        b.author AS book_author,
        COUNT(l.like_id)::int AS like_count
     FROM posts p
     LEFT JOIN books b ON b.book_id = p.book_id
     LEFT JOIN likes l ON l.post_id = p.post_id
     WHERE p.user_id = $1
       AND p.visibility = ANY($2::text[])
     GROUP BY p.post_id, b.title, b.author
     ORDER BY p.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, visibilities, limit, offset]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// POST /api/posts
// ---------------------------------------------------------------------------
async function create(userId, { bookId, caption, visibility }) {
  const { rows } = await pool.query(
    `INSERT INTO posts (user_id, book_id, caption, visibility)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, bookId ?? null, caption ?? null, visibility]
  );
  return rows[0];
}

// Single post, joined with book + like count - same shape as one row of
// findByUserPaginated, used to build the response right after creation and
// to check ownership before delete.
async function findById(postId) {
  const { rows } = await pool.query(
    `SELECT
        p.post_id,
        p.user_id,
        p.caption,
        p.visibility,
        p.created_at,
        p.book_id,
        b.title AS book_title,
        b.author AS book_author,
        COUNT(l.like_id)::int AS like_count
     FROM posts p
     LEFT JOIN books b ON b.book_id = p.book_id
     LEFT JOIN likes l ON l.post_id = p.post_id
     WHERE p.post_id = $1
     GROUP BY p.post_id, b.title, b.author`,
    [postId]
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