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
    // Case-insensitive uniqueness: "JaneDoe" and "janedoe" are treated as the
    // same username. The plain UNIQUE on the column above still exists as a
    // fast exact-match check; this index is what actually prevents duplicates
    // that only differ by case.
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_gmail_lower ON users (LOWER(gmail));`,
  ],
};