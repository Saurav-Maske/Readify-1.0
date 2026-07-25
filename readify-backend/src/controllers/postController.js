const postModel = require('../models/postModel');
const bookModel = require('../models/bookModel');

const VALID_VISIBILITIES = ['PUBLIC', 'PRIVATE', 'JUST_ME'];

// ---------------------------------------------------------------------------
// POST /api/posts   (protected, requireAuth)
//
// Body:
//   caption      string, optional
//   visibility   'PUBLIC' | 'PRIVATE' | 'JUST_ME', required
//   bookId       integer, optional - id of an existing book (catalog or
//                previously user-submitted)
//   title/author strings, optional - used instead of bookId when the book
//                isn't in the system yet. A matching book is reused if one
//                already exists (case-insensitive title+author match),
//                otherwise a new 'user_submitted' book row is created.
//   genre, publishedDate, coverImage - optional, only used when creating a
//                new book via title/author.
//
// At least one of {caption, bookId, title+author} should be present -
// an entirely empty post is rejected.
// ---------------------------------------------------------------------------
async function createPost(req, res, next) {
  try {
    const userId = req.user.userId;
    const { caption, visibility, bookId, title, author, genre, publishedDate, coverImage } = req.body;

    if (!VALID_VISIBILITIES.includes(visibility)) {
      return res.status(400).json({ error: `visibility must be one of ${VALID_VISIBILITIES.join(', ')}` });
    }

    if (!caption?.trim() && !bookId && !title) {
      return res.status(400).json({ error: 'Post must have a caption or a book attached' });
    }

    let book = null;
    if (bookId || title) {
      if (bookId && !Number.isInteger(Number(bookId))) {
        return res.status(400).json({ error: 'bookId must be an integer' });
      }
      if (!bookId && (!title?.trim() || !author?.trim())) {
        return res.status(400).json({ error: 'title and author are required when bookId is not provided' });
      }

      book = await bookModel.resolveBook({
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
    }

    const created = await postModel.create(userId, {
      bookId: book?.book_id,
      caption: caption?.trim() || null,
      visibility,
    });

    const post = await postModel.findById(created.post_id);

    return res.status(201).json({ post: formatPost(post) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/posts/:postId   (protected, requireAuth)
// Only the post's own author can delete it - enforced inside
// postModel.deleteById itself (user_id = $2 in the DELETE), so a mismatched
// owner reads the same as "not found" rather than leaking existence.
// ---------------------------------------------------------------------------
async function deletePost(req, res, next) {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.postId);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'postId must be an integer' });
    }

    const deleted = await postModel.deleteById(postId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function formatPost(p) {
  return {
    postId: p.post_id,
    caption: p.caption,
    visibility: p.visibility,
    createdAt: p.created_at,
    likeCount: p.like_count,
    book: p.book_id ? { bookId: p.book_id, title: p.book_title, author: p.book_author } : null,
  };
}

module.exports = { createPost, deletePost };