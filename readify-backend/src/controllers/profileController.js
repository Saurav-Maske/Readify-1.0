const fs = require('fs');
const path = require('path');

const userModel = require('../models/userModel');
const followerModel = require('../models/followerModel');
const reviewModel = require('../models/reviewModel');
const quoteModel = require('../models/quoteModel');
const postModel = require('../models/postModel');
const { toPublicUser } = require('../utils/userFormat');
const { getVisibleTiers } = require('../utils/visibility');

const MAX_BIO_LENGTH = 500;

// ---------------------------------------------------------------------------
// GET /api/users/:username
// Public route (optionalAuth) - works for logged-out visitors too.
// Returns core profile fields + follower/following/review counts, and tells
// the frontend the viewer's relationship to this profile: 'self' | 'friend'
// | 'stranger'. "Friend" = mutual follow - see followerModel.areFriends.
// ---------------------------------------------------------------------------
async function getProfile(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const relationship = await followerModel.getRelationship(req.user?.userId, targetUser.user_id);
    const isOwnProfile = relationship === 'self';

    // Separate from `relationship` above (which stays self/friend/stranger
    // because utils/visibility.js keys off exactly that shape). This gives
    // the frontend enough detail to show a one-sided relationship instead of
    // lumping "they follow me but I don't follow them" in with "stranger",
    // and to know whether the Follow button should read "Following".
    const followStatus = await followerModel.getFollowStatus(req.user?.userId, targetUser.user_id);

    const [followersCount, followingCount, reviewsCount] = await Promise.all([
      followerModel.countFollowers(targetUser.user_id),
      followerModel.countFollowing(targetUser.user_id),
      reviewModel.countByUser(targetUser.user_id),
    ]);

    const profile = toPublicUser(targetUser);
    if (!isOwnProfile) {
      // gmail and the first-login flag are nobody else's business
      delete profile.gmail;
      delete profile.isFirstLogin;
    }

    return res.json({
      user: profile,
      isOwnProfile,
      relationship, // 'self' | 'friend' | 'stranger' - visibility tiers only, don't repurpose
      followState: followStatus.status, // 'self' | 'mutual' | 'following' | 'follower' | 'stranger'
      viewerFollowsTarget: followStatus.viewerFollowsTarget,
      targetFollowsViewer: followStatus.targetFollowsViewer,
      followersCount,
      followingCount,
      reviewsCount,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/users/:username/quotes?limit=3
//
// Quotes have no visibility tiers of their own (unlike posts, which can be
// PUBLIC/PRIVATE/JUST_ME) - instead they're gated purely by relationship:
//   self     -> all of the owner's quotes
//   friend   -> all of the owner's quotes
//   stranger -> none at all
// ---------------------------------------------------------------------------
async function getRecentQuotes(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const relationship = await followerModel.getRelationship(req.user?.userId, targetUser.user_id);
    const limit = Math.min(Number(req.query.limit) || 3, 20);

    if (relationship === 'stranger') {
      return res.json({ quotes: [] });
    }

    const quotes = await quoteModel.findRecentByUser(targetUser.user_id, { limit, viewerId: req.user?.userId ?? null });

    return res.json({
      quotes: quotes.map((q) => ({
        quoteId: q.quote_id,
        quote: q.quote,
        createdAt: q.created_at,
        likeCount: q.like_count,
        likedByMe: q.liked_by_me,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/users/:username/posts?limit=3&offset=0
//
// Visibility by relationship:
//   self     -> PUBLIC + PRIVATE + JUST_ME
//   friend   -> PUBLIC + PRIVATE
//   stranger -> PUBLIC only
//
// Frontend usage: call once with limit=3&offset=0 for a fast first paint,
// then again with a larger limit and offset=3 to load the rest.
// ---------------------------------------------------------------------------
async function getPosts(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const relationship = await followerModel.getRelationship(req.user?.userId, targetUser.user_id);
    const visibilities = getVisibleTiers(relationship);
    const limit = Math.min(Number(req.query.limit) || 3, 30);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const posts = await postModel.findByUserPaginated(targetUser.user_id, {
      limit,
      offset,
      visibilities,
      viewerId: req.user?.userId ?? null,
    });

    return res.json({
      posts: posts.map((p) => ({
        postId: p.post_id,
        caption: p.caption,
        visibility: p.visibility,
        createdAt: p.created_at,
        likeCount: p.like_count,
        likedByMe: p.liked_by_me,
        commentCount: p.comment_count,
        book: p.book_id ? { bookId: p.book_id, title: p.book_title, author: p.book_author } : null,
      })),
      limit,
      offset,
      hasMore: posts.length === limit,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/users/:username/reviews?limit=3&offset=0
// Reviews have no visibility tiers - always public, so no relationship
// check needed here (unlike getPosts/getRecentQuotes).
// ---------------------------------------------------------------------------
async function getReviews(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const limit = Math.min(Number(req.query.limit) || 3, 30);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const reviews = await reviewModel.findByUserPaginated(targetUser.user_id, {
      limit,
      offset,
      viewerId: req.user?.userId ?? null,
    });

    return res.json({
      reviews: reviews.map((r) => ({
        reviewId: r.review_id,
        rating: Number(r.rating),
        review: r.review,
        createdAt: r.created_at,
        likeCount: r.like_count,
        likedByMe: r.liked_by_me,
        commentCount: r.comment_count,
        book: {
          bookId: r.book_id,
          title: r.book_title,
          author: r.book_author,
          coverImage: r.book_cover_image,
          // Average across all reviews for this book, not this reviewer's own rating above.
          rating: r.book_rating !== undefined ? Number(r.book_rating) : undefined,
          noOfRatings: r.book_no_of_ratings,
        },
      })),
      limit,
      offset,
      hasMore: reviews.length === limit,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/users/me   (protected, requireAuth)
// multipart/form-data with:
//   - optional text field  "bio"
//   - optional file field  "profilePicture" (jpeg/png/webp/gif, max 5MB)
// Only the fields actually sent get changed - matches userModel.updateProfile's
// COALESCE behavior. If a new picture is uploaded, the previous locally-
// stored file is deleted (best-effort, never blocks the response).
// ---------------------------------------------------------------------------
async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { bio } = req.body;

    if (bio !== undefined && bio.length > MAX_BIO_LENGTH) {
      return res.status(400).json({ error: `Bio must be ${MAX_BIO_LENGTH} characters or fewer` });
    }

    let profilePicture;
    let oldPicturePath;
    if (req.file) {
      profilePicture = `/uploads/profile-pictures/${req.file.filename}`;

      const currentUser = await userModel.findById(userId);
      if (currentUser?.profile_picture?.startsWith('/uploads/profile-pictures/')) {
        oldPicturePath = path.join(
          __dirname,
          '../../uploads/profile-pictures',
          path.basename(currentUser.profile_picture)
        );
      }
    }

    const updatedUser = await userModel.updateProfile(userId, { bio, profilePicture });
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (oldPicturePath) {
      fs.unlink(oldPicturePath, () => {}); // best-effort, ignore failures
    }

    return res.json({ user: toPublicUser(updatedUser) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, getRecentQuotes, getPosts, getReviews, updateMyProfile };