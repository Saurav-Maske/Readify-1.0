const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Discover is intentionally READ-ONLY at request time. Recommendations are
// computed offline (manually) by jobs/build_and_train_discover_graph.py,
// which fully refreshes this table each run. Nothing here computes
// similarity live - that's the split from the cosine-similarity feed system.
// ---------------------------------------------------------------------------
async function getRecommendationsForUser(userId, { limit = 10 } = {}) {
  const { rows } = await pool.query(
    `SELECT r.book_id, r.rank, r.score, r.reason_type, r.reason_data, r.generated_at,
            b.title, b.author, b.genre, b.cover_image, b.rating, b.no_of_ratings
     FROM recommendations r
     JOIN books b ON b.book_id = r.book_id
     WHERE r.user_id = $1
     ORDER BY r.rank ASC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

module.exports = { getRecommendationsForUser };