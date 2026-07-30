const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');

const profileController = require('../controllers/profileController');
const followController = require('../controllers/followController');
const shelfController = require('../controllers/shelfController');
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

// Serves profile picture bytes straight from Postgres. Two path segments,
// so this can never collide with the single-segment /:username route below,
// regardless of registration order. Public - profile pictures are visible
// the same way they always were on anyone's profile.
router.get('/picture/:userId', profileController.getProfilePictureImage);

// My Shelf (currently reading / want to read / finished) - all scoped to the
// logged-in user, also placed above /:username so they're never shadowed.
router.get('/me/shelf', requireAuth, shelfController.getShelf);
router.post('/me/shelf', requireAuth, shelfController.addToShelf);
router.patch('/me/shelf/:bookId/finish', requireAuth, shelfController.finishBook);
router.delete('/me/shelf/:status/:bookId', requireAuth, shelfController.removeFromShelf);

// "Remove follower" - removes someone from MY OWN followers list. Placed
// above /:username so it's never shadowed by the param route.
router.delete('/me/followers/:username', requireAuth, followController.removeFollower);

// All three work for logged-out visitors (public profile pages), but behave
// differently if the visitor happens to be logged in as the profile owner.
router.post('/reading-preferences', requireAuth, onboardingController.saveReadingPreferences);
router.post('/:username/follow', requireAuth, followController.followUser);
router.delete('/:username/follow', requireAuth, followController.unfollowUser);
router.get('/:username', optionalAuth, profileController.getProfile);
router.get('/:username/quotes', optionalAuth, profileController.getRecentQuotes);
router.get('/:username/posts', optionalAuth, profileController.getPosts);
router.get('/:username/reviews', optionalAuth, profileController.getReviews);
router.get('/:username/followers', optionalAuth, followController.getFollowers);
router.get('/:username/following', optionalAuth, followController.getFollowing);

module.exports = router;