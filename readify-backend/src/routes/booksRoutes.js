const express = require('express');
const router = express.Router();

const bookController = require('../controllers/bookController');

// /lookup is scoped to the compose-time "find this book / autofill author"
// flow (posts, reviews, quotes) - see bookController.lookupBooks. The
// general books/users discovery search is a separate future feature and
// intentionally does not live at this path, to avoid the two colliding.
router.get('/lookup', bookController.lookupBooks);
router.get('/:bookId', bookController.getBook);

module.exports = router;