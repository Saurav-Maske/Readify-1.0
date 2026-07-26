module.exports = {
  name: 'quotes',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS quotes (
      quote_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      quote TEXT NOT NULL,
      visibility TEXT DEFAULT 'PUBLIC',
      created_at TIMESTAMP DEFAULT NOW()
    );`,
  ],
};