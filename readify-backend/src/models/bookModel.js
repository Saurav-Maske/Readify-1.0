const pool = require('../config/db');

// ---------------------------------------------------------------------------
// GET /api/books/:bookId
// ---------------------------------------------------------------------------
async function findById(bookId) {
  const { rows } = await pool.query('SELECT * FROM books WHERE book_id = $1', [bookId]);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Backs GET /api/books/lookup?title=... - the compose-time "find this book"
// helper used by posts/reviews/quotes (see bookController.lookupBooks).
// Simple ILIKE search across title/author, catalog books ranked first.
// ---------------------------------------------------------------------------
async function search(query, { limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT *
     FROM books
     WHERE title ILIKE $1 OR author ILIKE $1
     ORDER BY (source = 'catalog') DESC, no_of_ratings DESC, title ASC
     LIMIT $2`,
    [`%${query}%`, limit]
  );
  return rows;
}

// Exact (case-insensitive) title+author match - used to avoid creating a
// duplicate user_submitted row every time the same not-yet-catalogued book
// gets posted/reviewed/quoted again.
async function findByTitleAndAuthor(title, author) {
  const { rows } = await pool.query(
    `SELECT * FROM books WHERE LOWER(title) = LOWER($1) AND LOWER(author) = LOWER($2)`,
    [title, author]
  );
  return rows[0] || null;
}

async function create({ title, author, genre = null, publishedDate = null, coverImage = null, addedBy = null }) {
  const { rows } = await pool.query(
    `INSERT INTO books (title, author, genre, published_date, cover_image, source, added_by)
     VALUES ($1, $2, $3, $4, $5, 'user_submitted', $6)
     RETURNING *`,
    [title, author, genre, publishedDate, coverImage, addedBy]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Used by postController/reviewController when the client sends a bookId
// (existing book, catalog or previously user-submitted) OR raw {title,
// author} details for a book that isn't in the system yet. Always resolves
// to a real book_id - see the comment on books.schema.js.
// ---------------------------------------------------------------------------
async function resolveBook({ bookId, title, author, genre, publishedDate, coverImage, addedBy }) {
  if (bookId) {
    const existing = await findById(bookId);
    return existing || null;
  }

  if (!title || !author) {
    return null;
  }

  const existing = await findByTitleAndAuthor(title, author);
  if (existing) return existing;

  return create({ title, author, genre, publishedDate, coverImage, addedBy });
}

module.exports = { findById, search, findByTitleAndAuthor, create, resolveBook };