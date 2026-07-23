module.exports = {
  name: 'books',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS books (
      book_id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      genre VARCHAR(100),
      published_date DATE,
      cover_image TEXT,
      rating NUMERIC(2,1) DEFAULT 0,
      -- 'catalog' = verified metadata in your book database.
      -- 'user_submitted' = created on the fly because a user posted/reviewed/
      -- quoted a book that wasn't in the catalog yet. Every reference (posts,
      -- reviews, quotes, wishlist, etc.) still gets a real book_id either way -
      -- the recommendation model just filters or down-weights by this column
      -- instead of the app having to special-case missing books anywhere.
      source VARCHAR(20) NOT NULL DEFAULT 'catalog' CHECK (source IN ('catalog', 'user_submitted')),
      -- who submitted it, if source = 'user_submitted'. Kept even if that user
      -- is later deleted (SET NULL) since the book itself should still exist.
      added_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    // Safe to re-run against a database that was created before these columns existed.
    `ALTER TABLE books ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'catalog';`,
    `ALTER TABLE books ADD COLUMN IF NOT EXISTS added_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;`,
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'books_source_check'
       ) THEN
         ALTER TABLE books
           ADD CONSTRAINT books_source_check CHECK (source IN ('catalog', 'user_submitted'));
       END IF;
     END $$;`,
    // Lets the recommendation model quickly pull only verified-catalog books.
    `CREATE INDEX IF NOT EXISTS idx_books_source ON books(source);`,
  ],
};