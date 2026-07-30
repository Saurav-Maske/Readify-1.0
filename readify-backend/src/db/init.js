const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const schemas = require('./schema');

// Committed to the repo (NOT gitignored, unlike /uploads) so it's always
// available at boot regardless of Render's ephemeral disk. Only affects the
// seed AI account (user_id = 0) - real users' pictures are uploaded by them
// and already stored in the DB via profileController.updateMyProfile.
const AI_AVATAR_PATH = path.join(__dirname, '../../seed-assets/readify-ai.jpg');
const AI_AVATAR_MIME = 'image/jpeg'; // matches the .jpg above - update both together if you swap formats

async function seedAiAvatar() {
  try {
    const buffer = fs.readFileSync(AI_AVATAR_PATH);
    await pool.query(
      `UPDATE users
       SET profile_picture = '/api/users/picture/0',
           profile_picture_data = $1,
           profile_picture_mime = $2
       WHERE user_id = 0`,
      [buffer, AI_AVATAR_MIME]
    );
    console.log('✅ Readify AI avatar seeded into the database');
  } catch (err) {
    console.warn('⚠️  Could not seed Readify AI avatar:', err.message);
  }
}

/**
 * Runs on every server start.
 *
 * Loops over every table's schema module (see ./schema/index.js):
 *  - temporary tables are dropped and recreated (always empty after a restart)
 *  - permanent tables are created only if missing, so real data is untouched
 *
 * Adding a new table later never requires touching this file - just add a
 * schema module and register it in ./schema/index.js.
 */
async function initDb() {
  // Enables trigram similarity (similarity(), the % operator, and gin_trgm_ops
  // indexes) used by userModel.search/bookModel.search for typo-tolerant,
  // punctuation-insensitive search. Wrapped in try/catch rather than assumed
  // because some managed Postgres providers restrict CREATE EXTENSION to
  // superusers - if it's unavailable we log clearly and search just falls
  // back to being ILIKE-only (see the guarded index blocks in the users/books
  // schemas below, which no-op the same way).
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    console.log('✅ pg_trgm extension ready (fuzzy/typo-tolerant search enabled)');
  } catch (err) {
    console.warn(
      '⚠️  Could not enable pg_trgm extension - fuzzy search will fall back to plain ILIKE matching.',
      err.message
    );
  }

  for (const schema of schemas) {
    if (schema.temporary) {
      await pool.query(`DROP TABLE IF EXISTS ${schema.name};`);
    }

    for (const statement of schema.sql) {
      await pool.query(statement);
    }

    console.log(
      `✅ ${schema.name} ready${schema.temporary ? ' (reset)' : ' (created if missing)'}`
    );
  }

  await seedAiAvatar();

  console.log('✅ Database initialization complete.');
}

module.exports = initDb;