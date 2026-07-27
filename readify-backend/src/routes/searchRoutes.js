const express = require('express');
const router = express.Router();

const searchController = require('../controllers/searchController');
const optionalAuth = require('../middleware/optionalAuth');

// GET /api/search?q=...  ("@name" -> users, anything else -> books)
router.get('/', optionalAuth, searchController.search);

module.exports = router;