module.exports = {
  name: 'reviews',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS reviews (
      review_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
      rating NUMERIC(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
      review TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);`,
  ],
};