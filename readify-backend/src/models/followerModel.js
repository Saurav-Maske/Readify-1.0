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
// Richer version of getRelationship for UI display purposes (profile header
// label + follow button state). Deliberately separate from getRelationship
// (which stays self/friend/stranger, unchanged, since visibility.js keys off
// that exact shape) so nothing about post/quote visibility changes here.
//
// Returns one of:
//   'self'              - viewing your own profile
//   'mutual'             - both users follow each other
//   'following'          - viewer follows target, target doesn't follow back
//   'follower'           - target follows viewer, viewer doesn't follow back
//   'stranger'           - neither follows the other
// ---------------------------------------------------------------------------
async function getFollowStatus(viewerId, targetUserId) {
  if (!viewerId) return { status: 'stranger', viewerFollowsTarget: false, targetFollowsViewer: false };
  if (viewerId === targetUserId) return { status: 'self', viewerFollowsTarget: false, targetFollowsViewer: false };

  const { rows } = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2) AS viewer_follows_target,
       EXISTS (SELECT 1 FROM followers WHERE follower_id = $2 AND following_id = $1) AS target_follows_viewer`,
    [viewerId, targetUserId]
  );
  const viewerFollowsTarget = rows[0].viewer_follows_target;
  const targetFollowsViewer = rows[0].target_follows_viewer;

  let status = 'stranger';
  if (viewerFollowsTarget && targetFollowsViewer) status = 'mutual';
  else if (viewerFollowsTarget) status = 'following';
  else if (targetFollowsViewer) status = 'follower';

  return { status, viewerFollowsTarget, targetFollowsViewer };
}

// ---------------------------------------------------------------------------
// GET /api/users/:username/followers - people who follow userId.
// Each row also reports whether the viewer follows that person back, so the
// frontend can render a per-row Follow/Following button in the list.
// ---------------------------------------------------------------------------
async function listFollowers(userId, { limit = 20, offset = 0, viewerId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT
       u.user_id, u.name, u.username, u.profile_picture,
       f.created_at AS followed_at,
       EXISTS (
         SELECT 1 FROM followers vf WHERE vf.follower_id = $3 AND vf.following_id = u.user_id
       ) AS viewer_follows_this_user
     FROM followers f
     JOIN users u ON u.user_id = f.follower_id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $4`,
    [userId, limit, viewerId, offset]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// GET /api/users/:username/following - people userId follows.
// ---------------------------------------------------------------------------
async function listFollowing(userId, { limit = 20, offset = 0, viewerId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT
       u.user_id, u.name, u.username, u.profile_picture,
       f.created_at AS followed_at,
       EXISTS (
         SELECT 1 FROM followers vf WHERE vf.follower_id = $3 AND vf.following_id = u.user_id
       ) AS viewer_follows_this_user
     FROM followers f
     JOIN users u ON u.user_id = f.following_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $4`,
    [userId, limit, viewerId, offset]
  );
  return rows;
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
  getFollowStatus,
  isFollowing,
  listFollowers,
  listFollowing,
  follow,
  unfollow,
};