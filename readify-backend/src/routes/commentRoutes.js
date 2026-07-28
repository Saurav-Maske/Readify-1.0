const express = require('express');
const router = express.Router();

const commentController = require('../controllers/commentController');
const requireAuth = require('../middleware/authMiddleware');

// Deleting a comment doesn't need to know whether it belongs to a post or a
// review - commentModel.deleteById enforces ownership by comment_id alone.
router.delete('/:commentId', requireAuth, commentController.deleteComment);

module.exports = router;