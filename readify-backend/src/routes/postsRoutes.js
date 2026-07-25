const express = require('express');
const router = express.Router();

const postController = require('../controllers/postController');
const requireAuth = require('../middleware/authMiddleware');

router.post('/', requireAuth, postController.createPost);
router.delete('/:postId', requireAuth, postController.deletePost);

module.exports = router;