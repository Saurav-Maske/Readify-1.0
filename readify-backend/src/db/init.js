const pool = require('../config/db');
const schemas = require('./schema');

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

  console.log('✅ Database initialization complete.');
}

module.exports = initDb;