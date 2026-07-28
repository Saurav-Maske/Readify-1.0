module.exports = {
  name: "ai",
  temporary: false,
  sql: [
    `
    CREATE TABLE IF NOT EXISTS ai_book_index_map (
      book_index INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE
    );
    `,

    `
    CREATE TABLE IF NOT EXISTS ai_user_index_map (
      user_index INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      is_real_readify_user BOOLEAN NOT NULL DEFAULT FALSE
    );
    `,

    `
    CREATE TABLE IF NOT EXISTS recommendations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
      rank INTEGER NOT NULL,
      score FLOAT,
      reason_type VARCHAR(30),
      reason_data JSONB,
      reason_text TEXT,
      generated_at TIMESTAMP DEFAULT NOW()
    );
    `,

    `
    CREATE INDEX IF NOT EXISTS idx_recommendations_user
    ON recommendations(user_id);
    `,

    `
    CREATE TABLE IF NOT EXISTS ai_reviews (
      id SERIAL PRIMARY KEY,
      book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
      review_id INTEGER REFERENCES reviews(review_id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    `
  ]
};