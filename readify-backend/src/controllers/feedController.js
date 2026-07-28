const feedModel = require('../models/feedModel');
const tasteModel = require('../models/tasteModel');
const { cosineSimilarity } = require('../utils/similarity');

// ---------------------------------------------------------------------------
// Tunable weights for the feed's ranking blend. Cosine similarity is one
// signal among several rather than the sole sort key - a highly-liked post
// from someone with different taste should still be able to surface, and
// "friends/following", "big-follower authors", and "readify_ai" are additive
// boosts instead of being forced into the similarity vector itself.
// ---------------------------------------------------------------------------
const FEED_WEIGHTS = {
  similarity: 4, // cosine(viewer taste, book) - reviews only, posts have no book
  recency: 2, // exponential decay, halves every RECENCY_HALF_LIFE_HOURS
  engagement: 1.5, // log1p(likes in the last 3 days)
  relationship: 3, // flat boost if the viewer follows the author
  authorInfluence: 1, // log1p(author follower count), scaled down
  aiBoost: 2.5, // flat boost for readify_ai (user_id 0)
};
const RECENCY_HALF_LIFE_HOURS = 48;

function recencyScore(createdAt) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.pow(0.5, Math.max(ageHours, 0) / RECENCY_HALF_LIFE_HOURS);
}

function scoreCandidate(row, similarity) {
  const relationship = row.viewer_follows_author ? 1 : 0;
  const aiBoost = row.user_id === 0 ? 1 : 0;

  return (
    FEED_WEIGHTS.similarity * similarity +
    FEED_WEIGHTS.recency * recencyScore(row.created_at) +
    FEED_WEIGHTS.engagement * Math.log1p(row.recent_like_count || 0) +
    FEED_WEIGHTS.relationship * relationship +
    FEED_WEIGHTS.authorInfluence * (Math.log1p(row.author_follower_count || 0) / 10) +
    FEED_WEIGHTS.aiBoost * aiBoost
  );
}

function formatAuthor(row) {
  return {
    userId: row.user_id,
    name: row.name,
    username: row.username,
    profilePicture: row.profile_picture,
  };
}

function formatPost(row) {
  return {
    type: 'post',
    postId: row.post_id,
    caption: row.caption,
    visibility: row.visibility,
    createdAt: row.created_at,
    likeCount: row.like_count,
    likedByMe: row.liked_by_me,
    commentCount: row.comment_count,
    author: formatAuthor(row),
    book: null,
  };
}

function formatReview(row) {
  return {
    type: 'review',
    reviewId: row.review_id,
    rating: Number(row.rating),
    review: row.review,
    createdAt: row.created_at,
    likeCount: row.like_count,
    likedByMe: row.liked_by_me,
    commentCount: row.comment_count,
    author: formatAuthor(row),
    book: {
      bookId: row.book_id,
      title: row.book_title,
      author: row.book_author,
      coverImage: row.book_cover_image,
      rating: row.book_rating !== undefined ? Number(row.book_rating) : undefined,
      noOfRatings: row.book_no_of_ratings,
    },
  };
}

// ---------------------------------------------------------------------------
// GET /api/feed?limit=20&offset=0   (protected, requireAuth)
//
// Merges posts + reviews from everyone except the viewer (respecting the
// same PUBLIC/PRIVATE/JUST_ME visibility rule as profileController), scores
// each candidate with the blend above, and returns them ranked.
// ---------------------------------------------------------------------------
async function getFeed(req, res, next) {
  try {
    const viewerId = req.user.userId;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [userVector, posts, reviews] = await Promise.all([
      tasteModel.buildUserVector(viewerId),
      feedModel.findCandidatePosts(viewerId),
      feedModel.findCandidateReviews(viewerId),
    ]);

    const scored = [];

    for (const row of posts) {
      // Posts have no book_id (see DATABASE.md), so there's nothing to run
      // cosine similarity against - similarity contributes 0 for posts.
      scored.push({ row, format: formatPost, score: scoreCandidate(row, 0) });
    }

    for (const row of reviews) {
      const bookVector = tasteModel.buildBookVector({ genre: row.book_genre, author: row.book_author });
      const similarity = cosineSimilarity(userVector, bookVector);
      scored.push({ row, format: formatReview, score: scoreCandidate(row, similarity) });
    }

    scored.sort((a, b) => b.score - a.score);
    const page = scored.slice(offset, offset + limit);

    return res.json({
      items: page.map((entry) => entry.format(entry.row)),
      limit,
      offset,
      hasMore: offset + limit < scored.length,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/feed/quotes   (protected, requireAuth)
// Quotes from the last 24 hours posted by friends (mutual follows).
// ---------------------------------------------------------------------------
async function getFriendQuotes(req, res, next) {
  try {
    const viewerId = req.user.userId;
    const quotes = await feedModel.findFriendQuotes(viewerId, { hours: 24, limit: 50 });

    return res.json({
      quotes: quotes.map((q) => ({
        quoteId: q.quote_id,
        quote: q.quote,
        createdAt: q.created_at,
        likeCount: q.like_count,
        likedByMe: q.liked_by_me,
        author: formatAuthor(q),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/feed/trending-books?limit=10   (protected, requireAuth)
// Popularity this week (review count + review likes) re-weighted by how
// well each book matches the viewer's taste vector.
// ---------------------------------------------------------------------------
const TRENDING_WEIGHTS = { reviewCount: 2, reviewLikes: 1, similarity: 3 };

async function getTrendingBooks(req, res, next) {
  try {
    const viewerId = req.user.userId;
    const limit = Math.min(Number(req.query.limit) || 10, 30);

    const [userVector, candidates] = await Promise.all([
      tasteModel.buildUserVector(viewerId),
      feedModel.findTrendingBookCandidates({ days: 7, cap: 100 }),
    ]);

    const scored = candidates.map((book) => {
      const bookVector = tasteModel.buildBookVector({ genre: book.genre, author: book.author });
      const similarity = cosineSimilarity(userVector, bookVector);
      const score =
        TRENDING_WEIGHTS.reviewCount * Math.log1p(book.recent_review_count) +
        TRENDING_WEIGHTS.reviewLikes * Math.log1p(book.recent_review_likes) +
        TRENDING_WEIGHTS.similarity * similarity;
      return { book, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return res.json({
      books: scored.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        bookId: entry.book.book_id,
        title: entry.book.title,
        author: entry.book.author,
        genre: entry.book.genre,
        coverImage: entry.book.cover_image,
        rating: Number(entry.book.rating),
        noOfRatings: entry.book.no_of_ratings,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/feed/connections?limit=5   (protected, requireAuth)
// "Readers to follow" - people not already followed, ranked by how similar
// their taste vector is to the viewer's.
// ---------------------------------------------------------------------------
async function getConnections(req, res, next) {
  try {
    const viewerId = req.user.userId;
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    const [userVector, candidates] = await Promise.all([
      tasteModel.buildUserVector(viewerId),
      feedModel.findConnectionCandidates(viewerId, { cap: 200 }),
    ]);

    // NOTE: builds a fresh vector per candidate (N+1 queries). Fine at
    // current scale; the first thing to change if this needs to handle a
    // large user base is precomputing/caching vectors in a table (see the
    // note atop tasteModel.js) instead of rebuilding them on every request.
    const scored = [];
    for (const candidate of candidates) {
      const candidateVector = await tasteModel.buildUserVector(candidate.user_id);
      const similarity = cosineSimilarity(userVector, candidateVector);
      scored.push({ candidate, similarity });
    }

    scored.sort((a, b) => b.similarity - a.similarity);

    return res.json({
      readers: scored.slice(0, limit).map((entry) => ({
        userId: entry.candidate.user_id,
        name: entry.candidate.name,
        username: entry.candidate.username,
        profilePicture: entry.candidate.profile_picture,
        reviewCount: entry.candidate.review_count,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFeed, getFriendQuotes, getTrendingBooks, getConnections };