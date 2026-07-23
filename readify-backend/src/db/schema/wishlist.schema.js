module.exports = {
  name: 'wishlist',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS wishlist (
      wishlist_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
      saved_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT unique_wishlist UNIQUE(user_id, book_id)
    );`,
  ],
};