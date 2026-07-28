const express = require('express');
const router = express.Router();

const quoteController = require('../controllers/quoteController');
const likeController = require('../controllers/likeController');
const requireAuth = require('../middleware/authMiddleware');

router.post('/', requireAuth, quoteController.createQuote);
router.delete('/:quoteId', requireAuth, quoteController.deleteQuote);

router.post('/:quoteId/like', requireAuth, likeController.likeQuote);
router.delete('/:quoteId/like', requireAuth, likeController.unlikeQuote);

module.exports = router;