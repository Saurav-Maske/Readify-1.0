const express = require('express');
const router = express.Router();

const bookController = require('../controllers/bookController');

// Placed above the /:bookId route so a request like /books?search=... is
// never accidentally matched as a bookId lookup.
router.get('/', bookController.searchBooks);
router.get('/:bookId', bookController.getBook);

module.exports = router;