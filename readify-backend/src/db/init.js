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
