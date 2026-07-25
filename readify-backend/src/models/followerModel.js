const pool = require('../config/db');

async function countFollowers(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM followers WHERE following_id = $1',
    [userId]
  );
  return rows[0].count;
}

async function countFollowing(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM followers WHERE follower_id = $1',
    [userId]
  );
  return rows[0].count;
}

// "Friend" = mutual follow (both users follow each other). If you actually
// want one-directional ("anyone who follows me can see PRIVATE"), swap the
// AND for OR below and rename accordingly.
async function areFriends(userIdA, userIdB) {
  const { rows } = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2) AS a_follows_b,
       EXISTS (SELECT 1 FROM followers WHERE follower_id = $2 AND following_id = $1) AS b_follows_a`,
    [userIdA, userIdB]
  );
  return rows[0].a_follows_b && rows[0].b_follows_a;
}

// Single entry point used by every profile-page endpoint to decide what a
// viewer is allowed to see. viewerId is undefined/null for logged-out visitors.
async function getRelationship(viewerId, targetUserId) {
  if (!viewerId) return 'stranger';
  if (viewerId === targetUserId) return 'self';
  const friends = await areFriends(viewerId, targetUserId);
  return friends ? 'friend' : 'stranger';
}

async function isFollowing(followerId, followingId) {
  const { rows } = await pool.query(
    'SELECT EXISTS (SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2) AS following',
    [followerId, followingId]
  );
  return rows[0].following;
}

// ---------------------------------------------------------------------------
// POST /api/users/:username/follow
// ON CONFLICT DO NOTHING makes this idempotent - following someone you
// already follow just no-ops instead of erroring.
// ---------------------------------------------------------------------------
async function follow(followerId, followingId) {
  const { rows } = await pool.query(
    `INSERT INTO followers (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, following_id) DO NOTHING
     RETURNING follow_id`,
    [followerId, followingId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// DELETE /api/users/:username/follow
// ---------------------------------------------------------------------------
async function unfollow(followerId, followingId) {
  const { rows } = await pool.query(
    `DELETE FROM followers WHERE follower_id = $1 AND following_id = $2 RETURNING follow_id`,
    [followerId, followingId]
  );
  return rows[0] || null;
}

module.exports = {
  countFollowers,
  countFollowing,
  areFriends,
  getRelationship,
  isFollowing,
  follow,
  unfollow,
};