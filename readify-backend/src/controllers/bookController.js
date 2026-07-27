const bookModel = require('../models/bookModel');
const reviewModel = require('../models/reviewModel');

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
// GET /api/books/lookup?title=dune&limit=8
//
// NOT the general book/user search feature (that's a separate, future
// endpoint that will cover browsing/discovery across both). This is the
// narrow lookup used while composing a post/review/quote: the frontend
// calls it as the user types a book title, shows the matches, and if the
// user picks one, the author autofills and the frontend just sends that
// book's bookId along with the post/review/quote. If nothing matches, the
// user types the title+author manually and postController/reviewController
// create a 'user_submitted' book for it via bookModel.resolveBook - the
// user never has to know whether the book already existed.
// ---------------------------------------------------------------------------
async function lookupBooks(req, res, next) {
  try {
    const { title } = req.query;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title query param is required' });
    }

    const limit = Math.min(Number(req.query.limit) || 8, 20);
    const books = await bookModel.search(title.trim(), { limit });

    return res.json({ books: books.map(formatBook) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/books/:bookId/reviews?limit=10&offset=0
// Public - reviews have no visibility tiers, same reasoning as
// profileController.getReviews.
// ---------------------------------------------------------------------------
async function getBookReviews(req, res, next) {
  try {
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      return res.status(400).json({ error: 'bookId must be an integer' });
    }

    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const offset = Number(req.query.offset) || 0;

    const reviews = await reviewModel.findByBookPaginated(bookId, { limit, offset });

    return res.json({
      reviews: reviews.map((r) => ({
        reviewId: r.review_id,
        rating: Number(r.rating),
        review: r.review,
        createdAt: r.created_at,
        reviewer: {
          userId: r.reviewer_id,
          name: r.reviewer_name,
          username: r.reviewer_username,
          profilePicture: r.reviewer_avatar,
        },
      })),
      limit,
      offset,
      hasMore: reviews.length === limit,
    });
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

module.exports = { getBook, lookupBooks, getBookReviews };