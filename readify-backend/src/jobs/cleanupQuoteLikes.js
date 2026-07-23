const pool = require('../config/db');

/**
 * Deletes `likes` rows for quotes older than 24 hours. Only the LIKE rows
 * are removed - the quotes themselves are left untouched, so they can later
 * be resurfaced as a "memories" feature (e.g. "this quote you liked a year
 * ago"). Post likes are untouched by this - only quote_id IS NOT NULL rows
 * are ever affected.
 */
async function cleanupExpiredQuoteLikes() {
  const { rowCount } = await pool.query(
    `DELETE FROM likes
     WHERE quote_id IS NOT NULL
       AND created_at < NOW() - INTERVAL '24 hours'`
  );
  if (rowCount > 0) {
    console.log(`🧹 Expired ${rowCount} quote like(s) older than 24h.`);
  }
  return rowCount;
}

/**
 * Starts a recurring cleanup: runs once immediately, then every
 * `intervalMs` for as long as the process is alive. Called once from
 * server.js after the DB is initialized.
 */
function startQuoteLikeCleanupJob(intervalMs = 60 * 60 * 1000) {
  cleanupExpiredQuoteLikes().catch((err) =>
    console.error('Quote-like cleanup failed:', err)
  );

  const handle = setInterval(() => {
    cleanupExpiredQuoteLikes().catch((err) =>
      console.error('Quote-like cleanup failed:', err)
    );
  }, intervalMs);

  // Don't let this interval keep the process alive on its own during tests/shutdown.
  handle.unref?.();

  return handle;
}

module.exports = { startQuoteLikeCleanupJob, cleanupExpiredQuoteLikes };
