const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/reviewController');
const likeController = require('../controllers/likeController');
const commentController = require('../controllers/commentController');
const requireAuth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');

router.post('/', requireAuth, reviewController.createReview);
router.delete('/:reviewId', requireAuth, reviewController.deleteReview);

router.post('/:reviewId/like', requireAuth, likeController.likeReview);
router.delete('/:reviewId/like', requireAuth, likeController.unlikeReview);

router.get('/:reviewId/comments', optionalAuth, commentController.getReviewComments);
router.post('/:reviewId/comments', requireAuth, commentController.addReviewComment);

module.exports = router;