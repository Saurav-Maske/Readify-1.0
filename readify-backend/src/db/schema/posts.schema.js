module.exports = {
  name: 'posts',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS posts (
      post_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
      caption TEXT,
      visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('PUBLIC','PRIVATE','JUST_ME')),
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);`,
  ],
};