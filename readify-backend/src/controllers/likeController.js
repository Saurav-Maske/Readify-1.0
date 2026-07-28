const postModel = require('../models/postModel');
const quoteModel = require('../models/quoteModel');
const reviewModel = require('../models/reviewModel');
const likeModel = require('../models/likeModel');

// ---------------------------------------------------------------------------
// POST /api/posts/:postId/like     (protected, requireAuth)
// DELETE /api/posts/:postId/like   (protected, requireAuth)
// Both respond with the up-to-date { likeCount, likedByMe } for the post so
// the frontend never has to guess the new count itself.
// ---------------------------------------------------------------------------
async function likePost(req, res, next) {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.postId);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'postId must be an integer' });
    }

    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await likeModel.likePost(userId, postId);
    const stats = await likeModel.getPostLikeStats(postId, userId);
    return res.json({ likeCount: stats.like_count, likedByMe: stats.liked_by_me });
  } catch (err) {
    next(err);
  }
}

async function unlikePost(req, res, next) {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.postId);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'postId must be an integer' });
    }

    await likeModel.unlikePost(userId, postId);
    const stats = await likeModel.getPostLikeStats(postId, userId);
    return res.json({ likeCount: stats.like_count, likedByMe: stats.liked_by_me });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/quotes/:quoteId/like     (protected, requireAuth)
// DELETE /api/quotes/:quoteId/like   (protected, requireAuth)
// ---------------------------------------------------------------------------
async function likeQuote(req, res, next) {
  try {
    const userId = req.user.userId;
    const quoteId = Number(req.params.quoteId);
    if (!Number.isInteger(quoteId)) {
      return res.status(400).json({ error: 'quoteId must be an integer' });
    }

    const quote = await quoteModel.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await likeModel.likeQuote(userId, quoteId);
    const stats = await likeModel.getQuoteLikeStats(quoteId, userId);
    return res.json({ likeCount: stats.like_count, likedByMe: stats.liked_by_me });
  } catch (err) {
    next(err);
  }
}

async function unlikeQuote(req, res, next) {
  try {
    const userId = req.user.userId;
    const quoteId = Number(req.params.quoteId);
    if (!Number.isInteger(quoteId)) {
      return res.status(400).json({ error: 'quoteId must be an integer' });
    }

    await likeModel.unlikeQuote(userId, quoteId);
    const stats = await likeModel.getQuoteLikeStats(quoteId, userId);
    return res.json({ likeCount: stats.like_count, likedByMe: stats.liked_by_me });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/reviews/:reviewId/like     (protected, requireAuth)
// DELETE /api/reviews/:reviewId/like   (protected, requireAuth)
// ---------------------------------------------------------------------------
async function likeReview(req, res, next) {
  try {
    const userId = req.user.userId;
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({ error: 'reviewId must be an integer' });
    }

    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await likeModel.likeReview(userId, reviewId);
    const stats = await likeModel.getReviewLikeStats(reviewId, userId);
    return res.json({ likeCount: stats.like_count, likedByMe: stats.liked_by_me });
  } catch (err) {
    next(err);
  }
}

async function unlikeReview(req, res, next) {
  try {
    const userId = req.user.userId;
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({ error: 'reviewId must be an integer' });
    }

    await likeModel.unlikeReview(userId, reviewId);
    const stats = await likeModel.getReviewLikeStats(reviewId, userId);
    return res.json({ likeCount: stats.like_count, likedByMe: stats.liked_by_me });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  likePost,
  unlikePost,
  likeQuote,
  unlikeQuote,
  likeReview,
  unlikeReview,
};