const pool = require('../config/db');

async function findByGmail(gmail) {
  const { rows } = await pool.query('SELECT * FROM users WHERE gmail = $1', [gmail]);
  return rows[0] || null;
}

async function findByUsername(username) {
  // Case-insensitive: "JaneDoe" matches an existing "janedoe".
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [
    username,
  ]);
  return rows[0] || null;
}

async function findByGoogleId(googleId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0] || null;
}

async function findById(userId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function createUser({ name, username, gmail, password = null, googleId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, username, gmail, password, google_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, name, username, gmail, google_id, created_at`,
    [name, username, gmail, password, googleId]
  );
  return rows[0];
}

async function linkGoogleId(userId, googleId) {
  const { rows } = await pool.query(
    `UPDATE users SET google_id = $1 WHERE user_id = $2
     RETURNING user_id, name, username, gmail, google_id, created_at`,
    [googleId, userId]
  );
  return rows[0];
}

async function updatePasswordByGmail(gmail, hashedPassword) {
  const { rows } = await pool.query(
    `UPDATE users SET password = $1 WHERE gmail = $2
     RETURNING user_id, name, username, gmail, google_id, created_at`,
    [hashedPassword, gmail]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Backs GET /api/search?q=@... - the "@" prefix means the caller wants
// people, not books (see searchController.search). Matches on username OR
// display name, exact username hits ranked first, then alphabetically.
// ---------------------------------------------------------------------------
async function search(query, { limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT *
     FROM users
     WHERE username ILIKE $1 OR name ILIKE $1
     ORDER BY (LOWER(username) = LOWER($2)) DESC, username ASC
     LIMIT $3`,
    [`%${query}%`, query, limit]
  );
  return rows;
}

async function updateProfile(userId, { bio, profilePicture }) {
  // Use COALESCE so that only the fields actually provided are changed.
  // If bio is undefined/null the existing bio is kept, same for profilePicture.
  const { rows } = await pool.query(
    `UPDATE users
     SET
       bio             = COALESCE($1, bio),
       profile_picture = COALESCE($2, profile_picture)
     WHERE user_id = $3
     RETURNING *`,
    [
      bio ?? null,
      profilePicture ?? null,
      userId,
    ]
  );
  return rows[0] || null;
}

module.exports = {
  findByGmail,
  findByUsername,
  findByGoogleId,
  findById,
  search,
  createUser,
  linkGoogleId,
  updatePasswordByGmail,
  updateProfile,
};