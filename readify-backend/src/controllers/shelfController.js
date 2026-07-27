const shelfModel = require('../models/shelfModel');
const bookModel = require('../models/bookModel');

const VALID_STATUSES = ['currently-reading', 'want-to-read', 'finished'];

function formatBook(row) {
  return {
    bookId: row.book_id,
    title: row.title,
    author: row.author,
    coverImage: row.cover_image,
  };
}

// ---------------------------------------------------------------------------
// GET /api/users/me/shelf   (protected, requireAuth)
// Returns the three shelf tabs the frontend renders, keyed the same way the
// MyShelf page's ShelfTab type is: 'currently-reading' | 'want-to-read' |
// 'finished'.
// ---------------------------------------------------------------------------
async function getShelf(req, res, next) {
  try {
    const userId = req.user.userId;

    const [currentlyReading, wishlist, finished] = await Promise.all([
      shelfModel.getCurrentlyReading(userId),
      shelfModel.getWishlist(userId),
      shelfModel.getFinished(userId),
    ]);

    return res.json({
      'currently-reading': currentlyReading.map((row) => ({
        ...formatBook(row),
        startedAt: row.started_at,
      })),
      'want-to-read': wishlist.map((row) => ({
        ...formatBook(row),
        savedAt: row.saved_at,
      })),
      finished: finished.map((row) => ({
        ...formatBook(row),
        startedAt: row.started_at,
        finishedAt: row.finished_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/users/me/shelf   (protected, requireAuth)
//
// Body:
//   status              'currently-reading' | 'want-to-read' | 'finished', required
//   bookId               integer, optional - id of an existing book
//   title/author         strings, optional - used instead of bookId, same
//                         find-or-create behavior as postController/reviewController
//   genre, publishedDate, coverImage - optional, only used when creating a
//                         new book via title/author.
// ---------------------------------------------------------------------------
async function addToShelf(req, res, next) {
  try {
    const userId = req.user.userId;
    const { status, bookId, title, author, genre, publishedDate, coverImage } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
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

    if (status === 'want-to-read') {
      await shelfModel.addToWishlist(userId, book.book_id);
    } else if (status === 'currently-reading') {
      await shelfModel.setCurrentlyReading(userId, book.book_id);
    } else {
      await shelfModel.addFinished(userId, book.book_id);
    }

    return res.status(201).json({ book: formatBook(book), status });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/users/me/shelf/:bookId/finish   (protected, requireAuth)
// Moves a book from "Currently Reading" to "Finished". If the book wasn't
// already in current_reading (e.g. finishing directly), it's still added to
// the finished shelf.
// ---------------------------------------------------------------------------
async function finishBook(req, res, next) {
  try {
    const userId = req.user.userId;
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      return res.status(400).json({ error: 'bookId must be an integer' });
    }

    const history = await shelfModel.finishBook(userId, bookId);
    return res.json({
      finished: {
        bookId: history.book_id,
        startedAt: history.started_at,
        finishedAt: history.finished_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/users/me/shelf/:status/:bookId   (protected, requireAuth)
// status selects which table to remove the book from.
// ---------------------------------------------------------------------------
async function removeFromShelf(req, res, next) {
  try {
    const userId = req.user.userId;
    const { status } = req.params;
    const bookId = Number(req.params.bookId);

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }
    if (!Number.isInteger(bookId)) {
      return res.status(400).json({ error: 'bookId must be an integer' });
    }

    let deleted;
    if (status === 'want-to-read') {
      deleted = await shelfModel.removeFromWishlist(userId, bookId);
    } else if (status === 'currently-reading') {
      deleted = await shelfModel.removeCurrentlyReading(userId, bookId);
    } else {
      deleted = await shelfModel.removeFinished(userId, bookId);
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Not found on this shelf' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getShelf, addToShelf, finishBook, removeFromShelf };