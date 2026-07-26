const quoteModel = require('../models/quoteModel');
const bookModel = require('../models/bookModel');

const VALID_VISIBILITIES = ['PUBLIC', 'PRIVATE', 'JUST_ME'];

// ---------------------------------------------------------------------------
// POST /api/quotes   (protected, requireAuth)
//
// Body:
//   quote        string, required
//   visibility   'PUBLIC' | 'PRIVATE' | 'JUST_ME', required
//   bookId       integer, optional - id of an existing book
//   title/author strings, optional - used instead of bookId, same
//                find-or-create behavior as postController.createPost /
//                reviewController.createReview
//   genre, publishedDate, coverImage - optional, only used when creating a
//                new book via title/author.
//
// Like reviews, a quote always needs a book, so either bookId or
// title+author is required. Unlike reviews, quotes carry a visibility tier
// (same PUBLIC/PRIVATE/JUST_ME rule as posts).
// ---------------------------------------------------------------------------
async function createQuote(req, res, next) {
  try {
    const userId = req.user.userId;
    const { quote, visibility, bookId, title, author, genre, publishedDate, coverImage } = req.body;

    if (!quote?.trim()) {
      return res.status(400).json({ error: 'quote text is required' });
    }

    if (!VALID_VISIBILITIES.includes(visibility)) {
      return res.status(400).json({ error: `visibility must be one of ${VALID_VISIBILITIES.join(', ')}` });
    }

    if (!bookId && (!title?.trim() || !author?.trim())) {
      return res.status(400).json({ error: 'bookId, or title and author, is required' });
    }

    if (bookId && !Number.isInteger(Number(bookId))) {
      return res.status(400).json({ error: 'bookId must be an integer' });
    }

    const book = await bookModel.resolveBook({
      bookId: bookId ? Number(bookId) : undefined,
      title,
      author,
      genre,
      publishedDate,
      coverImage,
      addedBy: userId,
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const created = await quoteModel.create(userId, {
      bookId: book.book_id,
      quote: quote.trim(),
      visibility,
    });

    const fullQuote = await quoteModel.findById(created.quote_id);

    return res.status(201).json({ quote: formatQuote(fullQuote) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/quotes/:quoteId   (protected, requireAuth)
// Same ownership-in-the-query pattern as postController.deletePost /
// reviewController.deleteReview.
// ---------------------------------------------------------------------------
async function deleteQuote(req, res, next) {
  try {
    const userId = req.user.userId;
    const quoteId = Number(req.params.quoteId);
    if (!Number.isInteger(quoteId)) {
      return res.status(400).json({ error: 'quoteId must be an integer' });
    }

    const deleted = await quoteModel.deleteById(quoteId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function formatQuote(q) {
  return {
    quoteId: q.quote_id,
    quote: q.quote,
    visibility: q.visibility,
    createdAt: q.created_at,
    book: { bookId: q.book_id, title: q.book_title, author: q.book_author },
  };
}

module.exports = { createQuote, deleteQuote };