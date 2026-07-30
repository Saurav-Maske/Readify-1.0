const pool = require('../config/db');

// Placeholder cover used for a user-submitted book when no cover image was
// supplied. Intentionally a dead link (returns 404) rather than null/empty,
// per product requirement - the frontend's <img> onError fallback treats it
// the same way it treats any other broken cover URL.
const NOT_FOUND_COVER_IMAGE = '/covers/404-not-found.jpg';

// ---------------------------------------------------------------------------
// GET /api/books/:bookId
// ---------------------------------------------------------------------------
async function findById(bookId) {
  const { rows } = await pool.query('SELECT * FROM books WHERE book_id = $1', [bookId]);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Backs GET /api/books/lookup?title=... - the compose-time "find this book"
// helper used by posts/reviews/quotes (see bookController.lookupBooks) - and
// GET /api/search (searchController.search).
//
// Three ways a row can match, so the caller doesn't have to type things
// exactly right:
//   1. Plain substring ILIKE on title/author - the common case.
//   2. Punctuation-normalized ILIKE ("J. K. Rowling" == "JK Rowling" == "j k
//      rowling") - strips everything but letters/digits on both sides.
//   3. Trigram word_similarity (pg_trgm) above a threshold - catches typos
//      like "hurry potter" -> "Harry Potter", and (unlike plain similarity(),
//      which compares whole strings and unfairly penalizes a short query
//      against a long title) still works well for partial/short queries
//      since it scores the best-matching substring instead.
// Results are ranked by how good the match is (best similarity first), with
// verified catalog books still nudged ahead of user-submitted ones.
// ---------------------------------------------------------------------------
const TRIGRAM_SIMILARITY_THRESHOLD = 0.3;

async function search(query, { limit = 20 } = {}) {
  const normalizedQuery = query.replace(/[^a-zA-Z0-9]/g, '');
  const { rows } = await pool.query(
    `SELECT *,
            GREATEST(word_similarity($2, title), word_similarity($2, author)) AS match_score
     FROM books
     WHERE title ILIKE $1
        OR author ILIKE $1
        OR regexp_replace(title, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || $3 || '%'
        OR regexp_replace(author, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || $3 || '%'
        OR word_similarity($2, title) > ${TRIGRAM_SIMILARITY_THRESHOLD}
        OR word_similarity($2, author) > ${TRIGRAM_SIMILARITY_THRESHOLD}
     ORDER BY (source = 'catalog') DESC, match_score DESC, no_of_ratings DESC, title ASC
     LIMIT $4`,
    [`%${query}%`, query, normalizedQuery, limit]
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
    [title, author, genre, publishedDate, coverImage || NOT_FOUND_COVER_IMAGE, addedBy]
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

// ---------------------------------------------------------------------------
// Recomputes books.rating (average) and books.no_of_ratings from the reviews
// table for a single book. Called after any review is created or deleted so
// the stored average never drifts from the underlying reviews.
// Recomputing from scratch (rather than incrementally adjusting a running
// average) keeps this correct even if reviews are ever edited/bulk-deleted,
// and it's a single atomic statement so there's no read-then-write race.
// Safe to call for a book with zero reviews left - rating resets to 0.
// ---------------------------------------------------------------------------
async function recalculateRating(bookId) {
  const { rows } = await pool.query(
    `UPDATE books
     SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE book_id = $1), 0),
         no_of_ratings = (SELECT COUNT(*)::int FROM reviews WHERE book_id = $1)
     WHERE book_id = $1
     RETURNING rating, no_of_ratings`,
    [bookId]
  );
  return rows[0] || null;
}

module.exports = { findById, search, findByTitleAndAuthor, create, resolveBook, recalculateRating };