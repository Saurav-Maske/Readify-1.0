const express = require('express');
const router = express.Router();

const feedController = require('../controllers/feedController');
const requireAuth = require('../middleware/authMiddleware');

router.get('/', requireAuth, feedController.getFeed);
router.get('/quotes', requireAuth, feedController.getFriendQuotes);
router.get('/trending-books', requireAuth, feedController.getTrendingBooks);
router.get('/connections', requireAuth, feedController.getConnections);

module.exports = router;