const postModel = require('../models/postModel');

const VALID_VISIBILITIES = ['PUBLIC', 'PRIVATE', 'JUST_ME'];

// ---------------------------------------------------------------------------
// POST /api/posts   (protected, requireAuth)
//
// Body:
//   caption      string, optional
//   visibility   'PUBLIC' | 'PRIVATE' | 'JUST_ME', required
//
// A post is valid as long as it has some caption text.
// ---------------------------------------------------------------------------
async function createPost(req, res, next) {
  try {
    const userId = req.user.userId;
    const { caption, visibility } = req.body;

    if (!VALID_VISIBILITIES.includes(visibility)) {
      return res.status(400).json({ error: `visibility must be one of ${VALID_VISIBILITIES.join(', ')}` });
    }

    if (!caption?.trim()) {
      return res.status(400).json({ error: 'Post must have a caption' });
    }

    const created = await postModel.create(userId, {
      caption: caption.trim(),
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
  };
}

module.exports = { createPost, deletePost };