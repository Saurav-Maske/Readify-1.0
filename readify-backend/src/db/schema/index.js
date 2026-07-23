/**
 * Central registry of every table's schema module.
 *
 * To add a new table as the product grows:
 *   1. Create src/db/schema/<table>.schema.js following the same shape
 *      ({ name, temporary, sql: [...] }).
 *   2. Import it and add it to this array. ORDER MATTERS - a table with a
 *      foreign key must come after the table(s) it references.
 *
 * db/init.js just loops over this list - it never needs to change.
 */
const users = require('./users.schema');
const tempUsers = require('./tempUsers.schema');
const books = require('./books.schema');
const followers = require('./followers.schema');
const currentReading = require('./currentReading.schema');
const readingHistory = require('./readingHistory.schema');
const wishlist = require('./wishlist.schema');
const posts = require('./posts.schema');
const quotes = require('./quotes.schema');
const likes = require('./likes.schema');       // depends on posts + quotes
const comments = require('./comments.schema'); // depends on posts
const reviews = require('./reviews.schema');
const userOnboarding = require('./userOnboarding.schema'); // depends on users

module.exports = [
  users,
  tempUsers,
  books,
  followers,
  currentReading,
  readingHistory,
  wishlist,
  posts,
  quotes,
  likes,
  comments,
  reviews,
  userOnboarding,
];