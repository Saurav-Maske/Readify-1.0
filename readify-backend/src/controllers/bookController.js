const bookModel = require('../models/bookModel');

// ---------------------------------------------------------------------------
// GET /api/books/:bookId
// ---------------------------------------------------------------------------
async function getBook(req, res, next) {
  try {
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      return res.status(400).json({ error: 'bookId must be an integer' });
    }

    const book = await bookModel.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    return res.json({ book: formatBook(book) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/books?search=dune&limit=20
// Title/author search, e.g. for a "which book is this post/review about"
// picker on the frontend. Catalog matches are ranked ahead of user-submitted
// ones.
// ---------------------------------------------------------------------------
async function searchBooks(req, res, next) {
  try {
    const { search } = req.query;
    if (!search || !search.trim()) {
      return res.status(400).json({ error: 'search query param is required' });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const books = await bookModel.search(search.trim(), { limit });

    return res.json({ books: books.map(formatBook) });
  } catch (err) {
    next(err);
  }
}

function formatBook(b) {
  return {
    bookId: b.book_id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    publishedDate: b.published_date,
    coverImage: b.cover_image,
    rating: b.rating !== undefined ? Number(b.rating) : null,
    noOfRatings: b.no_of_ratings,
    source: b.source,
  };
}

module.exports = { getBook, searchBooks };