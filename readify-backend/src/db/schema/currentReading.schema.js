module.exports = {
  name: 'current_reading',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS current_reading (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
      started_at TIMESTAMP DEFAULT NOW()
    );`,
  ],
};