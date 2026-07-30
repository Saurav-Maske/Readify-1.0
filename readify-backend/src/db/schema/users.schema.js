/**
 * Schema module for the permanent `users` table.
 *
 * Each schema module exports:
 *  - name: table name
 *  - temporary: false = created with IF NOT EXISTS (data persists across restarts)
 *  - sql: an array of statements to run, in order, to bring the table up to date
 */
module.exports = {
  name: 'users',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      gmail VARCHAR(150) UNIQUE NOT NULL,
      password TEXT,               -- null for accounts created via Google only
      google_id VARCHAR(100) UNIQUE, -- null for accounts created via local signup only
      profile_picture TEXT,        -- empty until the user sets one from their profile page
      bio TEXT,                    -- empty until the user sets one from their profile page
      is_first_login BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    // Profile pictures are now stored as bytes directly in the DB instead of
    // on local disk (Render's disk is ephemeral - files written at runtime
    // don't survive restarts/redeploys). `profile_picture` still holds a
    // URL string (now pointing at GET /api/users/picture/:userId instead of
    // a static /uploads path) so every existing consumer of that column
    // (feed/comments/followers/reviews queries, toPublicUser, frontend image
    // helpers) keeps working unchanged.
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_data BYTEA;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_mime TEXT;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_gmail_lower ON users (LOWER(gmail));`,
    // System/service account used to attribute AI-generated content (e.g. auto-added
    // catalog books). Forced to user_id = 0 so app code can special-case it reliably.
    // password/google_id are both null since this isn't a real login-capable account.
    // profile_picture is left unset here - seedAiAvatar() in db/init.js is the
    // single source of truth for this account's picture (reads seed-assets/
    // and writes the bytes + the /api/users/picture/0 URL on every boot).
    `INSERT INTO users (user_id, name, username, gmail, is_first_login, bio)
     VALUES (
       0,
       'Readify AI',
       'readify_ai',
       'ai@readify.internal',
       FALSE,
       'Your reading companion 🤖📚 I surface picks, catalog new books, and leave the occasional review. Not a real reader - just here to help you find your next one.'
     )
     ON CONFLICT (user_id) DO NOTHING;`,
    // Keeps the system account's bio pinned to the above even if this row
    // already existed from an earlier version of this migration.
    `UPDATE users
     SET bio = 'Your reading companion 🤖📚 I surface picks, catalog new books, and leave the occasional review. Not a real reader - just here to help you find your next one.'
     WHERE user_id = 0 AND bio IS NULL;`,
    // Trigram indexes back the typo-tolerant/fuzzy matching in
    // userModel.search (similarity() + the % operator). Wrapped so a
    // database without pg_trgm available just skips these instead of
    // failing the whole init run - search then falls back to plain ILIKE.
    `DO $$
     BEGIN
       BEGIN
         CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
         CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
       EXCEPTION WHEN OTHERS THEN
         RAISE NOTICE 'Skipping trigram indexes on users (pg_trgm unavailable)';
       END;
     END $$;`,
  ],
};