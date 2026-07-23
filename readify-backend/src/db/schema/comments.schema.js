module.exports = {
  name: 'comments',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS comments (
      comment_id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      parent_comment_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);`,
    // Fast "get replies to this comment" lookups.
    `CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);`,
  ],
};