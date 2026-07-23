module.exports = {
  name: 'reading_history',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS reading_history (
      history_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
      started_at TIMESTAMP,
      finished_at TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);`,
  ],
};