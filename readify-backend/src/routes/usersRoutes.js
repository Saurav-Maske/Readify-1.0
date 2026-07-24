const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');

const profileController = require('../controllers/profileController');
const optionalAuth = require('../middleware/optionalAuth');
const requireAuth = require('../middleware/authMiddleware');
const uploadProfilePicture = require('../middleware/uploadProfilePicture');

// Placed above the /:username routes so it's never shadowed by the param route.
router.patch(
  '/me',
  requireAuth,
  uploadProfilePicture.single('profilePicture'),
  profileController.updateMyProfile
);

// All three work for logged-out visitors (public profile pages), but behave
// differently if the visitor happens to be logged in as the profile owner.
router.post('/reading-preferences', requireAuth, onboardingController.saveReadingPreferences);
router.get('/:username', optionalAuth, profileController.getProfile);
router.get('/:username/quotes', optionalAuth, profileController.getRecentQuotes);
router.get('/:username/posts', optionalAuth, profileController.getPosts);
router.get('/:username/reviews', optionalAuth, profileController.getReviews);

module.exports = router;