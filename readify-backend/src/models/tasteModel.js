const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Builds the term vectors that feedModel/similarity.js run cosine similarity
// over. Terms are namespaced ('genre:fantasy', 'author:brandon sanderson')
// so genre and author signals never collide with each other in the same
// vector space.
//
// v1 note: this is a straightforward TF-weighted bag of genre/author terms,
// computed live per request rather than precomputed/cached. That's the
// simplification flagged when this was proposed - genre text is normalized
// (lowercased, comma/slash-split) since `books.genre` is free text and
// would otherwise fragment the vector space ("Sci-Fi" vs "Science Fiction").
// Precomputing + caching these vectors in a table, and upgrading raw counts
// to TF-IDF against the full book corpus, are the natural next steps if
// this needs to scale further.
// ---------------------------------------------------------------------------

function normalizeTerm(raw) {
  return String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
}

// "Fantasy, Adventure" / "Fantasy/Adventure" -> ['fantasy', 'adventure']
function splitGenres(genreText) {
  if (!genreText) return [];
  return genreText
    .split(/[,/]/)
    .map(normalizeTerm)
    .filter(Boolean);
}

function addTerm(vector, term, weight) {
  if (!term || !weight) return;
  vector[term] = (vector[term] || 0) + weight;
}

// Vector for a single book - used both to score a review against a viewer's
// taste vector, and to build a "book vector" for trending-books ranking.
function buildBookVector({ genre, author }) {
  const vector = {};
  splitGenres(genre).forEach((g) => addTerm(vector, `genre:${g}`, 2));
  if (author) addTerm(vector, `author:${normalizeTerm(author)}`, 1);
  return vector;
}

// ---------------------------------------------------------------------------
// User taste vector, blended from two sources:
//  - Behavior (reviews, wishlist, reading history, current read) - the
//    strongest signal, rating-weighted so a 5-star review says far more
//    about taste than a 1-star one.
//  - Onboarding free-text answers (genres/favorite authors) - the cold-start
//    fallback. Once real behavior exists it's kept as a light supporting
//    signal rather than being dropped, since a user's very first answers
//    are still informative even after they start reviewing books.
// ---------------------------------------------------------------------------
async function buildUserVector(userId) {
  const vector = {};

  const { rows: reviewRows } = await pool.query(
    `SELECT b.genre, b.author, r.rating
     FROM reviews r
     JOIN books b ON b.book_id = r.book_id
     WHERE r.user_id = $1`,
    [userId]
  );
  for (const row of reviewRows) {
    // Floor at 0.2 so even a low rating still counts as *some* engagement
    // signal for that genre/author, rather than cancelling it out.
    const ratingWeight = Math.max(Number(row.rating) / 5, 0.2);
    splitGenres(row.genre).forEach((g) => addTerm(vector, `genre:${g}`, 3 * ratingWeight));
    if (row.author) addTerm(vector, `author:${normalizeTerm(row.author)}`, 1.5 * ratingWeight);
  }

  const { rows: wishlistRows } = await pool.query(
    `SELECT b.genre, b.author FROM wishlist w JOIN books b ON b.book_id = w.book_id WHERE w.user_id = $1`,
    [userId]
  );
  for (const row of wishlistRows) {
    splitGenres(row.genre).forEach((g) => addTerm(vector, `genre:${g}`, 1));
    if (row.author) addTerm(vector, `author:${normalizeTerm(row.author)}`, 0.5);
  }

  const { rows: historyRows } = await pool.query(
    `SELECT b.genre, b.author FROM reading_history rh JOIN books b ON b.book_id = rh.book_id WHERE rh.user_id = $1`,
    [userId]
  );
  for (const row of historyRows) {
    splitGenres(row.genre).forEach((g) => addTerm(vector, `genre:${g}`, 1.5));
    if (row.author) addTerm(vector, `author:${normalizeTerm(row.author)}`, 0.75);
  }

  const { rows: currentRows } = await pool.query(
    `SELECT b.genre, b.author FROM current_reading cr JOIN books b ON b.book_id = cr.book_id WHERE cr.user_id = $1`,
    [userId]
  );
  for (const row of currentRows) {
    splitGenres(row.genre).forEach((g) => addTerm(vector, `genre:${g}`, 1.5));
    if (row.author) addTerm(vector, `author:${normalizeTerm(row.author)}`, 0.75);
  }

  const { rows: onboardingRows } = await pool.query(
    `SELECT genres, favorite_authors FROM user_onboarding WHERE user_id = $1`,
    [userId]
  );
  const onboarding = onboardingRows[0];
  const hasBehaviorSignal = Object.keys(vector).length > 0;
  // Dominant only for a brand-new user with no behavior yet (cold start);
  // a light supporting signal once real activity exists.
  const onboardingWeight = hasBehaviorSignal ? 1 : 3;
  if (onboarding) {
    (onboarding.genres || []).forEach((g) => addTerm(vector, `genre:${normalizeTerm(g)}`, onboardingWeight));
    (onboarding.favorite_authors || []).forEach((a) =>
      addTerm(vector, `author:${normalizeTerm(a)}`, onboardingWeight * 0.5)
    );
  }

  return vector;
}

module.exports = { buildUserVector, buildBookVector, splitGenres, normalizeTerm };