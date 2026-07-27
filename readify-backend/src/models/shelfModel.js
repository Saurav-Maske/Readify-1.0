const pool = require('../config/db');

// ---------------------------------------------------------------------------
// GET /api/users/me/shelf
// Three independent lists, each joined with its book. current_reading is at
// most one row per user (UNIQUE user_id); wishlist/reading_history can have
// many.
// ---------------------------------------------------------------------------

async function getCurrentlyReading(userId) {
  const { rows } = await pool.query(
    `SELECT
        cr.book_id,
        cr.started_at,
        b.title,
        b.author,
        b.cover_image
     FROM current_reading cr
     JOIN books b ON b.book_id = cr.book_id
     WHERE cr.user_id = $1`,
    [userId]
  );
  return rows;
}

async function getWishlist(userId) {
  const { rows } = await pool.query(
    `SELECT
        w.book_id,
        w.saved_at,
        b.title,
        b.author,
        b.cover_image
     FROM wishlist w
     JOIN books b ON b.book_id = w.book_id
     WHERE w.user_id = $1
     ORDER BY w.saved_at DESC`,
    [userId]
  );
  return rows;
}

async function getFinished(userId) {
  const { rows } = await pool.query(
    `SELECT
        rh.history_id,
        rh.book_id,
        rh.started_at,
        rh.finished_at,
        b.title,
        b.author,
        b.cover_image
     FROM reading_history rh
     JOIN books b ON b.book_id = rh.book_id
     WHERE rh.user_id = $1
       AND rh.finished_at IS NOT NULL
     ORDER BY rh.finished_at DESC`,
    [userId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// POST /api/users/me/shelf  { status: 'want-to-read' }
// Idempotent - re-adding a book already on the wishlist just no-ops.
// ---------------------------------------------------------------------------
async function addToWishlist(userId, bookId) {
  const { rows } = await pool.query(
    `INSERT INTO wishlist (user_id, book_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, book_id) DO NOTHING
     RETURNING *`,
    [userId, bookId]
  );
  return rows[0] || null;
}

async function removeFromWishlist(userId, bookId) {
  const { rows } = await pool.query(
    `DELETE FROM wishlist WHERE user_id = $1 AND book_id = $2 RETURNING wishlist_id`,
    [userId, bookId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// POST /api/users/me/shelf  { status: 'currently-reading' }
// Only one current book per user (current_reading.user_id is UNIQUE), so
// starting a new one replaces whatever was there - the old one is left
// exactly where it was (still just "currently reading" until the user
// explicitly finishes or removes it), matching how a real shelf works.
// ---------------------------------------------------------------------------
async function setCurrentlyReading(userId, bookId) {
  const { rows } = await pool.query(
    `INSERT INTO current_reading (user_id, book_id, started_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET book_id = EXCLUDED.book_id, started_at = NOW()
     RETURNING *`,
    [userId, bookId]
  );
  return rows[0];
}

async function removeCurrentlyReading(userId, bookId) {
  const { rows } = await pool.query(
    `DELETE FROM current_reading WHERE user_id = $1 AND book_id = $2 RETURNING id`,
    [userId, bookId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// PATCH /api/users/me/shelf/:bookId/finish
// Moves a book out of current_reading and into reading_history with
// finished_at set. started_at carries over from current_reading if it was
// there; otherwise the book is being marked finished directly (e.g. added
// straight to the "Finished" shelf) and both timestamps are "now".
// ---------------------------------------------------------------------------
async function finishBook(userId, bookId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await client.query(
      `DELETE FROM current_reading WHERE user_id = $1 AND book_id = $2 RETURNING started_at`,
      [userId, bookId]
    );
    const startedAt = current.rows[0]?.started_at || null;

    const { rows } = await client.query(
      `INSERT INTO reading_history (user_id, book_id, started_at, finished_at)
       VALUES ($1, $2, COALESCE($3, NOW()), NOW())
       RETURNING *`,
      [userId, bookId, startedAt]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Adds a book straight to "Finished" without it ever being in current_reading.
async function addFinished(userId, bookId) {
  const { rows } = await pool.query(
    `INSERT INTO reading_history (user_id, book_id, started_at, finished_at)
     VALUES ($1, $2, NOW(), NOW())
     RETURNING *`,
    [userId, bookId]
  );
  return rows[0];
}

async function removeFinished(userId, bookId) {
  const { rows } = await pool.query(
    `DELETE FROM reading_history
     WHERE user_id = $1 AND book_id = $2 AND finished_at IS NOT NULL
     RETURNING history_id`,
    [userId, bookId]
  );
  return rows[0] || null;
}

module.exports = {
  getCurrentlyReading,
  getWishlist,
  getFinished,
  addToWishlist,
  removeFromWishlist,
  setCurrentlyReading,
  removeCurrentlyReading,
  finishBook,
  addFinished,
  removeFinished,
};