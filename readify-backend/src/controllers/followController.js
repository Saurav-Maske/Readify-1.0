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

module.exports = { followUser, unfollowUser };