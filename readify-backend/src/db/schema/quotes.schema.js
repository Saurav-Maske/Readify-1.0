module.exports = {
  name: 'quotes',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS quotes (
      quote_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
      quote TEXT NOT NULL,
      visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('PUBLIC','PRIVATE','JUST_ME')),
      created_at TIMESTAMP DEFAULT NOW()
    );`,
  ],
};