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
// Backs GET /api/search?q=@... (people-only mode) and the "both" mode in
// searchController.search. Three ways a row can match, so the caller doesn't
// have to type things exactly right:
//   1. Plain substring ILIKE on username/name - the common case.
//   2. Punctuation-normalized ILIKE ("J. K. Rowling" == "JK Rowling" == "j k
//      rowling") - strips everything but letters/digits on both sides.
//   3. Trigram word_similarity (pg_trgm) above a threshold - catches typos.
//      word_similarity (rather than plain similarity()) scores the best-
//      matching substring, so a short/partial query like "jonh" still finds
//      "johnsmith" instead of being penalized for the length difference.
// Exact username hits are still ranked first, then by match quality.
// ---------------------------------------------------------------------------
const TRIGRAM_SIMILARITY_THRESHOLD = 0.3;

async function search(query, { limit = 20 } = {}) {
  const normalizedQuery = query.replace(/[^a-zA-Z0-9]/g, '');
  const { rows } = await pool.query(
    `SELECT *,
            GREATEST(word_similarity($2, username), word_similarity($2, name)) AS match_score
     FROM users
     WHERE username ILIKE $1
        OR name ILIKE $1
        OR regexp_replace(username, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || $3 || '%'
        OR regexp_replace(name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || $3 || '%'
        OR word_similarity($2, username) > ${TRIGRAM_SIMILARITY_THRESHOLD}
        OR word_similarity($2, name) > ${TRIGRAM_SIMILARITY_THRESHOLD}
     ORDER BY (LOWER(username) = LOWER($2)) DESC, match_score DESC, username ASC
     LIMIT $4`,
    [`%${query}%`, query, normalizedQuery, limit]
  );
  return rows;
}

async function updateProfile(userId, { bio, profilePictureUrl, profilePictureData, profilePictureMime }) {
  // Use COALESCE so that only the fields actually provided are changed.
  // If any of these is undefined/null, the existing value is kept.
  const { rows } = await pool.query(
    `UPDATE users
     SET
       bio                  = COALESCE($1, bio),
       profile_picture      = COALESCE($2, profile_picture),
       profile_picture_data = COALESCE($3, profile_picture_data),
       profile_picture_mime = COALESCE($4, profile_picture_mime)
     WHERE user_id = $5
     RETURNING *`,
    [
      bio ?? null,
      profilePictureUrl ?? null,
      profilePictureData ?? null,
      profilePictureMime ?? null,
      userId,
    ]
  );
  return rows[0] || null;
}

// Used by GET /api/users/picture/:userId to stream the image bytes back.
// Kept as a narrow, separate query (not part of findById) so routes that
// just need profile metadata never pull the (potentially large) image bytes
// along with them.
async function getProfilePicture(userId) {
  const { rows } = await pool.query(
    `SELECT profile_picture_data, profile_picture_mime FROM users WHERE user_id = $1`,
    [userId]
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
  getProfilePicture,
};