const userModel = require('../models/userModel');
const followerModel = require('../models/followerModel');

// ---------------------------------------------------------------------------
// POST /api/users/:username/follow   (protected, requireAuth)
// Idempotent - following someone you already follow just returns the
// current state rather than erroring.
// ---------------------------------------------------------------------------
async function followUser(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.user_id === req.user.userId) {
      return res.status(400).json({ error: "You can't follow yourself" });
    }

    await followerModel.follow(req.user.userId, targetUser.user_id);
    const followersCount = await followerModel.countFollowers(targetUser.user_id);

    return res.json({ following: true, followersCount });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/users/:username/follow   (protected, requireAuth)
// Also idempotent - unfollowing someone you don't follow just returns the
// current (already-not-following) state.
// ---------------------------------------------------------------------------
async function unfollowUser(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await followerModel.unfollow(req.user.userId, targetUser.user_id);
    const followersCount = await followerModel.countFollowers(targetUser.user_id);

    return res.json({ following: false, followersCount });
  } catch (err) {
    next(err);
  }
}

function formatFollowEntry(row) {
  return {
    userId: row.user_id,
    name: row.name,
    username: row.username,
    profilePicture: row.profile_picture || null,
    followedAt: row.followed_at,
    // Whether the logged-in viewer follows this list entry - lets the
    // frontend show "Follow"/"Following" per row without another request.
    isFollowedByViewer: row.viewer_follows_this_user,
  };
}

// ---------------------------------------------------------------------------
// GET /api/users/:username/followers?limit=20&offset=0   (optionalAuth)
// ---------------------------------------------------------------------------
async function getFollowers(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const rows = await followerModel.listFollowers(targetUser.user_id, {
      limit,
      offset,
      viewerId: req.user?.userId ?? null,
    });

    return res.json({
      followers: rows.map(formatFollowEntry),
      limit,
      offset,
      hasMore: rows.length === limit,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/users/:username/following?limit=20&offset=0   (optionalAuth)
// ---------------------------------------------------------------------------
async function getFollowing(req, res, next) {
  try {
    const { username } = req.params;
    const targetUser = await userModel.findByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const rows = await followerModel.listFollowing(targetUser.user_id, {
      limit,
      offset,
      viewerId: req.user?.userId ?? null,
    });

    return res.json({
      following: rows.map(formatFollowEntry),
      limit,
      offset,
      hasMore: rows.length === limit,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/users/me/followers/:username   (protected, requireAuth)
// "Remove follower" - lets the logged-in user forcibly remove someone from
// their OWN followers list, without unfollowing them back. This is the
// mirror of unfollowUser (which removes the reverse direction: someone you
// follow). Idempotent, same as follow/unfollow.
// ---------------------------------------------------------------------------
async function removeFollower(req, res, next) {
  try {
    const { username } = req.params;
    const followerUser = await userModel.findByUsername(username);
    if (!followerUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // followerUser -> req.user.userId is the relationship being deleted.
    await followerModel.unfollow(followerUser.user_id, req.user.userId);
    const followersCount = await followerModel.countFollowers(req.user.userId);

    return res.json({ removed: true, followersCount });
  } catch (err) {
    next(err);
  }
}

module.exports = { followUser, unfollowUser, getFollowers, getFollowing, removeFollower };