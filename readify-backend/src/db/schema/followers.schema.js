module.exports = {
  name: 'followers',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS followers (
      follow_id SERIAL PRIMARY KEY,
      follower_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT unique_follow UNIQUE(follower_id, following_id),
      CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
    );`,
    // These make "how many followers/following does user X have" fast -
    // count(*) WHERE following_id = X (followers) or follower_id = X (following).
    `CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);`,
    `CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);`,
  ],
};