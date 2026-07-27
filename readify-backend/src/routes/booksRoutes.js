const express = require('express');
const router = express.Router();

const bookController = require('../controllers/bookController');

// /lookup is scoped to the compose-time "find this book / autofill author"
// flow (posts, reviews, quotes) - see bookController.lookupBooks. The
// general books/users discovery search lives at GET /api/search instead
// (see searchRoutes.js / searchController.js), to avoid the two colliding.
router.get('/lookup', bookController.lookupBooks);
router.get('/:bookId', bookController.getBook);

module.exports = router;