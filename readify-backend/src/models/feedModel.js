const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Candidate posts for the feed: everyone's posts except the viewer's own,
// filtered by the same visibility rule as profileController/visibility.js
// (PUBLIC always visible; PRIVATE only if the viewer and the author are
// mutual follows i.e. "friends"; JUST_ME never shown to anyone else).
// Capped at a bounded candidate pool - final ranking/scoring happens in JS
// in feedController, so this only needs to hand back "everything eligible",
// not the final sorted order.
// ---------------------------------------------------------------------------
async function findCandidatePosts(viewerId, { since = null, cap = 300 } = {}) {
  const { rows } = await pool.query(
    `SELECT
        p.post_id, p.user_id, p.caption, p.visibility, p.created_at,
        u.name, u.username, u.profile_picture,
        COUNT(DISTINCT l.like_id)::int AS like_count,
        COUNT(DISTINCT l.like_id) FILTER (WHERE l.created_at > NOW() - INTERVAL '3 days')::int AS recent_like_count,
        COALESCE(BOOL_OR(l.user_id = $1), false) AS liked_by_me,
        COUNT(DISTINCT c.comment_id)::int AS comment_count,
        (SELECT COUNT(*)::int FROM followers f WHERE f.following_id = p.user_id) AS author_follower_count,
        EXISTS (
          SELECT 1 FROM followers fa WHERE fa.follower_id = $1 AND fa.following_id = p.user_id
        ) AS viewer_follows_author
     FROM posts p
     JOIN users u ON u.user_id = p.user_id
     LEFT JOIN likes l ON l.post_id = p.post_id
     LEFT JOIN comments c ON c.post_id = p.post_id
     WHERE p.user_id != $1
       AND ($3::timestamp IS NULL OR p.created_at > $3)
       AND (
         p.visibility = 'PUBLIC'
         OR (
           p.visibility = 'PRIVATE'
           AND EXISTS (SELECT 1 FROM followers fa WHERE fa.follower_id = $1 AND fa.following_id = p.user_id)
           AND EXISTS (SELECT 1 FROM followers fb WHERE fb.follower_id = p.user_id AND fb.following_id = $1)
         )
       )
     GROUP BY p.post_id, u.user_id
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [viewerId, cap, since]
  );
  return rows;
}

// Reviews are always public (no visibility tiers), so every review by anyone
// other than the viewer is a candidate.
async function findCandidateReviews(viewerId, { since = null, cap = 300 } = {}) {
  const { rows } = await pool.query(
    `SELECT
        r.review_id, r.user_id, r.rating, r.review, r.created_at, r.book_id,
        b.title AS book_title, b.author AS book_author, b.genre AS book_genre,
        b.cover_image AS book_cover_image, b.rating AS book_rating, b.no_of_ratings AS book_no_of_ratings,
        u.name, u.username, u.profile_picture,
        COUNT(DISTINCT l.like_id)::int AS like_count,
        COUNT(DISTINCT l.like_id) FILTER (WHERE l.created_at > NOW() - INTERVAL '3 days')::int AS recent_like_count,
        COALESCE(BOOL_OR(l.user_id = $1), false) AS liked_by_me,
        COUNT(DISTINCT c.comment_id)::int AS comment_count,
        (SELECT COUNT(*)::int FROM followers f WHERE f.following_id = r.user_id) AS author_follower_count,
        EXISTS (
          SELECT 1 FROM followers fa WHERE fa.follower_id = $1 AND fa.following_id = r.user_id
        ) AS viewer_follows_author
     FROM reviews r
     JOIN books b ON b.book_id = r.book_id
     JOIN users u ON u.user_id = r.user_id
     LEFT JOIN likes l ON l.review_id = r.review_id
     LEFT JOIN comments c ON c.review_id = r.review_id
     WHERE r.user_id != $1
       AND ($3::timestamp IS NULL OR r.created_at > $3)
     GROUP BY r.review_id, b.book_id, u.user_id
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [viewerId, cap, since]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// GET /api/feed/quotes - quotes posted in the last 24 hours by people the
// viewer is friends with (mutual follow), per the same "friend" definition
// followerModel.areFriends uses. For each quote we look at who posted it
// (q.user_id) and check the relationship to the viewer before including it.
// ---------------------------------------------------------------------------
async function findFriendQuotes(viewerId, { hours = 24, limit = 50 } = {}) {
  const { rows } = await pool.query(
    `SELECT
        q.quote_id, q.quote, q.created_at, q.user_id,
        u.name, u.username, u.profile_picture,
        COUNT(l.like_id)::int AS like_count,
        COALESCE(BOOL_OR(l.user_id = $1), false) AS liked_by_me
     FROM quotes q
     JOIN users u ON u.user_id = q.user_id
     LEFT JOIN likes l ON l.quote_id = q.quote_id
     WHERE q.user_id != $1
       AND q.created_at > NOW() - ($3 || ' hours')::interval
       -- "friend" = mutual follow: viewer follows the quote's author AND
       -- the author follows the viewer back.
       AND EXISTS (SELECT 1 FROM followers fa WHERE fa.follower_id = $1 AND fa.following_id = q.user_id)
       AND EXISTS (SELECT 1 FROM followers fb WHERE fb.follower_id = q.user_id AND fb.following_id = $1)
     GROUP BY q.quote_id, u.user_id
     ORDER BY q.created_at DESC
     LIMIT $2`,
    [viewerId, limit, hours]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// GET /api/feed/trending-books - candidate books with review/like activity
// in the last `days` days. Final personalized re-ranking (blending this
// popularity signal with cosine similarity to the viewer's taste) happens
// in feedController.
// ---------------------------------------------------------------------------
async function findTrendingBookCandidates({ days = 7, cap = 100 } = {}) {
  const { rows } = await pool.query(
    `SELECT
        b.book_id, b.title, b.author, b.genre, b.cover_image, b.rating, b.no_of_ratings,
        COUNT(DISTINCT r.review_id)::int AS recent_review_count,
        COUNT(DISTINCT l.like_id)::int AS recent_review_likes
     FROM books b
     JOIN reviews r ON r.book_id = b.book_id AND r.created_at > NOW() - ($1 || ' days')::interval
     LEFT JOIN likes l ON l.review_id = r.review_id AND l.created_at > NOW() - ($1 || ' days')::interval
     GROUP BY b.book_id
     ORDER BY recent_review_count DESC, recent_review_likes DESC
     LIMIT $2`,
    [days, cap]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// GET /api/feed/connections - candidate users to suggest as "readers to
// follow": anyone the viewer doesn't already follow, isn't themselves, and
// isn't the readify_ai system account (user_id 0 isn't a person to follow).
// Only users with *some* taste signal (a review or a completed onboarding
// survey) are eligible, since cosine similarity against an empty vector is
// meaningless. Final similarity ranking happens in feedController.
// ---------------------------------------------------------------------------
async function findConnectionCandidates(viewerId, { cap = 200 } = {}) {
  const { rows } = await pool.query(
    `SELECT DISTINCT
        u.user_id, u.name, u.username, u.profile_picture,
        (SELECT COUNT(*)::int FROM reviews rv WHERE rv.user_id = u.user_id) AS review_count
     FROM users u
     WHERE u.user_id != $1
       AND u.user_id != 0
       AND NOT EXISTS (SELECT 1 FROM followers f WHERE f.follower_id = $1 AND f.following_id = u.user_id)
       AND (
         EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = u.user_id)
         OR EXISTS (SELECT 1 FROM user_onboarding ob WHERE ob.user_id = u.user_id)
       )
     LIMIT $2`,
    [viewerId, cap]
  );
  return rows;
}

module.exports = {
  findCandidatePosts,
  findCandidateReviews,
  findFriendQuotes,
  findTrendingBookCandidates,
  findConnectionCandidates,
};