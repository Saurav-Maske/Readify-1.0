const reviewModel = require('../models/reviewModel');
const bookModel = require('../models/bookModel');

// ---------------------------------------------------------------------------
// POST /api/reviews   (protected, requireAuth)
//
// Body:
//   rating       number 0-5, required
//   review       string, required
//   bookId       integer, optional - id of an existing book
//   title/author strings, optional - used instead of bookId, same
//                find-or-create behavior as postController.createPost
//   genre, publishedDate, coverImage - optional, only used when creating a
//                new book via title/author.
//
// Unlike posts, a review always needs a book (reviews.book_id is NOT NULL),
// so either bookId or title+author is required.
// ---------------------------------------------------------------------------
async function createReview(req, res, next) {
  try {
    const userId = req.user.userId;
    const { rating, review, bookId, title, author, genre, publishedDate, coverImage } = req.body;

    const numericRating = Number(rating);
    if (rating === undefined || Number.isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
      return res.status(400).json({ error: 'rating must be a number between 0 and 5' });
    }

    if (!review?.trim()) {
      return res.status(400).json({ error: 'review text is required' });
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

    const created = await reviewModel.create(userId, {
      bookId: book.book_id,
      rating: numericRating,
      review: review.trim(),
    });

    // Keep the book's stored average in sync with the reviews that back it.
    await bookModel.recalculateRating(book.book_id);

    const fullReview = await reviewModel.findById(created.review_id);

    return res.status(201).json({ review: formatReview(fullReview) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/reviews/:reviewId   (protected, requireAuth)
// Same ownership-in-the-query pattern as postController.deletePost.
// ---------------------------------------------------------------------------
async function deleteReview(req, res, next) {
  try {
    const userId = req.user.userId;
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({ error: 'reviewId must be an integer' });
    }

    const deleted = await reviewModel.deleteById(reviewId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Keep the book's stored average in sync now that this review is gone.
    await bookModel.recalculateRating(deleted.book_id);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function formatReview(r) {
  return {
    reviewId: r.review_id,
    rating: Number(r.rating),
    review: r.review,
    createdAt: r.created_at,
    likeCount: r.like_count ?? 0,
    likedByMe: r.liked_by_me ?? false,
    commentCount: r.comment_count ?? 0,
    book: {
      bookId: r.book_id,
      title: r.book_title,
      author: r.book_author,
      coverImage: r.book_cover_image,
      // Average across all reviews for this book, not this reviewer's own rating above.
      rating: r.book_rating !== undefined ? Number(r.book_rating) : undefined,
      noOfRatings: r.book_no_of_ratings,
    },
  };
}

module.exports = { createReview, deleteReview };