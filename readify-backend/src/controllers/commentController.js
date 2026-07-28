const postModel = require('../models/postModel');
const reviewModel = require('../models/reviewModel');
const commentModel = require('../models/commentModel');

function formatComment(c) {
  return {
    commentId: c.comment_id,
    parentCommentId: c.parent_comment_id,
    comment: c.comment,
    createdAt: c.created_at,
    author: {
      userId: c.user_id,
      name: c.name,
      username: c.username,
      profilePicture: c.profile_picture,
    },
  };
}

// ---------------------------------------------------------------------------
// GET /api/posts/:postId/comments   (public, optionalAuth)
// ---------------------------------------------------------------------------
async function getPostComments(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'postId must be an integer' });
    }

    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = await commentModel.findByPost(postId);
    return res.json({ comments: comments.map(formatComment) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/posts/:postId/comments   (protected, requireAuth)
//
// Body:
//   comment           string, required
//   parentCommentId   integer, optional - set to reply to another comment
// ---------------------------------------------------------------------------
async function addPostComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.postId);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'postId must be an integer' });
    }

    const { comment, parentCommentId } = req.body;
    if (!comment?.trim()) {
      return res.status(400).json({ error: 'comment text is required' });
    }

    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const created = await commentModel.createForPost(userId, postId, {
      comment: comment.trim(),
      parentCommentId: parentCommentId ? Number(parentCommentId) : null,
    });
    const fullComment = await commentModel.findById(created.comment_id);

    return res.status(201).json({ comment: formatComment(fullComment) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/reviews/:reviewId/comments   (public, optionalAuth)
// ---------------------------------------------------------------------------
async function getReviewComments(req, res, next) {
  try {
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({ error: 'reviewId must be an integer' });
    }

    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const comments = await commentModel.findByReview(reviewId);
    return res.json({ comments: comments.map(formatComment) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/reviews/:reviewId/comments   (protected, requireAuth)
// ---------------------------------------------------------------------------
async function addReviewComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({ error: 'reviewId must be an integer' });
    }

    const { comment, parentCommentId } = req.body;
    if (!comment?.trim()) {
      return res.status(400).json({ error: 'comment text is required' });
    }

    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const created = await commentModel.createForReview(userId, reviewId, {
      comment: comment.trim(),
      parentCommentId: parentCommentId ? Number(parentCommentId) : null,
    });
    const fullComment = await commentModel.findById(created.comment_id);

    return res.status(201).json({ comment: formatComment(fullComment) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/comments/:commentId   (protected, requireAuth)
// Works for a comment on either a post or a review - ownership is enforced
// inside commentModel.deleteById itself.
// ---------------------------------------------------------------------------
async function deleteComment(req, res, next) {
  try {
    const userId = req.user.userId;
    const commentId = Number(req.params.commentId);
    if (!Number.isInteger(commentId)) {
      return res.status(400).json({ error: 'commentId must be an integer' });
    }

    const deleted = await commentModel.deleteById(commentId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPostComments,
  addPostComment,
  getReviewComments,
  addReviewComment,
  deleteComment,
};