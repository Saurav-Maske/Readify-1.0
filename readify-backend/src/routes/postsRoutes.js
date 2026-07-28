const express = require('express');
const router = express.Router();

const postController = require('../controllers/postController');
const likeController = require('../controllers/likeController');
const commentController = require('../controllers/commentController');
const requireAuth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');

router.post('/', requireAuth, postController.createPost);
router.delete('/:postId', requireAuth, postController.deletePost);

router.post('/:postId/like', requireAuth, likeController.likePost);
router.delete('/:postId/like', requireAuth, likeController.unlikePost);

router.get('/:postId/comments', optionalAuth, commentController.getPostComments);
router.post('/:postId/comments', requireAuth, commentController.addPostComment);

module.exports = router;