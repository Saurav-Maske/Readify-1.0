const discoverModel = require('../models/discoverModel');

// ---------------------------------------------------------------------------
// Human-readable reason text, templated from the structured reason_type the
// Python job computed - no LLM call needed, and every reason traces back to
// a real graph signal rather than being invented at request time.
// ---------------------------------------------------------------------------
const REASON_TEXT = {
  currently_reading_match: 'Similar to what you\u2019re currently reading',
  reading_history_match: 'Because you\u2019ve read similar books before',
  wishlist_match: 'Matches books on your wishlist',
  social_engagement: 'Because you\u2019ve engaged with similar reviews',
  friend_activity: 'Friends of yours have this book in their reading',
  similar_readers: 'Readers with similar taste enjoyed this',
};

function formatRecommendation(row) {
  return {
    bookId: row.book_id,
    rank: row.rank,
    title: row.title,
    author: row.author,
    genre: row.genre,
    coverImage: row.cover_image,
    rating: row.rating !== undefined ? Number(row.rating) : undefined,
    noOfRatings: row.no_of_ratings,
    reason: REASON_TEXT[row.reason_type] || REASON_TEXT.similar_readers,
    generatedAt: row.generated_at,
  };
}

// GET /api/discover?limit=10   (protected, requireAuth)
async function getDiscoverRecommendations(req, res, next) {
  try {
    const viewerId = req.user.userId;
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    const rows = await discoverModel.getRecommendationsForUser(viewerId, { limit });

    return res.json({ recommendations: rows.map(formatRecommendation) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDiscoverRecommendations };