const userModel = require('../models/userModel');
const bookModel = require('../models/bookModel');
const followerModel = require('../models/followerModel');
const { toPublicUser } = require('../utils/userFormat');

// ---------------------------------------------------------------------------
// GET /api/search?q=...&limit=20
//
// One search bar, two result types:
//   "@jane"  -> search people only by username/name (users mode)
//   "dune"   -> search BOTH books and users in parallel (both mode)
//
// optionalAuth is used so a logged-in viewer's follow status can be
// attached to each user result, but logged-out visitors can still search.
// ---------------------------------------------------------------------------
async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'q query param is required' });
    }

    const trimmed = q.trim();
    const limit = Math.min(Number(req.query.limit) || 20, 30);
    const isUserSearch = trimmed.startsWith('@');

    if (isUserSearch) {
      const term = trimmed.slice(1).trim();
      if (!term) {
        return res.json({ mode: 'users', query: trimmed, results: [] });
      }

      const users = await userModel.search(term, { limit });
      const viewerId = req.user?.userId;

      const results = await Promise.all(
        users.map(async (u) => {
          const isSelf = viewerId === u.user_id;
          const following = !isSelf && viewerId ? await followerModel.isFollowing(viewerId, u.user_id) : false;
          const publicUser = toPublicUser(u);
          delete publicUser.gmail;
          delete publicUser.isFirstLogin;
          return { ...publicUser, isSelf, isFollowing: following };
        })
      );

      return res.json({ mode: 'users', query: trimmed, results });
    }

    // For non-@ searches, search both books AND users in parallel
    const viewerId = req.user?.userId;
    const [books, users] = await Promise.all([
      bookModel.search(trimmed, { limit }),
      userModel.search(trimmed, { limit: 10 }),
    ]);

    const userResults = await Promise.all(
      users.map(async (u) => {
        const isSelf = viewerId === u.user_id;
        const following = !isSelf && viewerId ? await followerModel.isFollowing(viewerId, u.user_id) : false;
        const publicUser = toPublicUser(u);
        delete publicUser.gmail;
        delete publicUser.isFirstLogin;
        return { ...publicUser, isSelf, isFollowing: following };
      })
    );

    return res.json({
      mode: 'both',
      query: trimmed,
      bookResults: books.map(formatBook),
      userResults,
    });
  } catch (err) {
    next(err);
  }
}

function formatBook(b) {
  return {
    bookId: b.book_id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    publishedDate: b.published_date,
    coverImage: b.cover_image,
    rating: b.rating !== undefined ? Number(b.rating) : null,
    noOfRatings: b.no_of_ratings,
    source: b.source,
  };
}

module.exports = { search };