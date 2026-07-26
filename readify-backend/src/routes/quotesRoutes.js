const express = require('express');
const router = express.Router();

const quoteController = require('../controllers/quoteController');
const requireAuth = require('../middleware/authMiddleware');

router.post('/', requireAuth, quoteController.createQuote);
router.delete('/:quoteId', requireAuth, quoteController.deleteQuote);

module.exports = router;