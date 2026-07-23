module.exports = {
  name: 'likes',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS likes (
      like_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
      quote_id INTEGER REFERENCES quotes(quote_id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      -- exactly one of post_id / quote_id must be set - a like is either
      -- on a post or on a quote, never both, never neither.
      CONSTRAINT like_target_exactly_one CHECK (
        (post_id IS NOT NULL AND quote_id IS NULL) OR
        (post_id IS NULL AND quote_id IS NOT NULL)
      )
    );`,
    // Plain UNIQUE(user_id, post_id) wouldn't be enough on its own: Postgres
    // treats every NULL as distinct, so a user could "like" unlimited quotes
    // since post_id is NULL on all of those rows. Partial indexes scoped to
    // only non-null rows give correct one-like-per-target-per-user behavior
    // for both post likes and quote likes independently.
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_post_like ON likes(user_id, post_id) WHERE post_id IS NOT NULL;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_quote_like ON likes(user_id, quote_id) WHERE quote_id IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);`,
    `CREATE INDEX IF NOT EXISTS idx_likes_quote_id ON likes(quote_id);`,
  ],
};