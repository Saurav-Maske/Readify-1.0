const express = require('express');
const router = express.Router();

const discoverController = require('../controllers/discoverController');
const requireAuth = require('../middleware/authMiddleware');

router.get('/', requireAuth, discoverController.getDiscoverRecommendations);

module.exports = router;