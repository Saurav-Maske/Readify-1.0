/**
 * One row per user, filled in during the first-login onboarding flow.
 * Every answer is a plain column - no book/genre/author matching against
 * other tables. books_read, genres, and favorite_authors are just arrays
 * of whatever text the user typed/picked; nothing here is linked to the
 * `books` table. The recommendation model can use these as-is to avoid a
 * cold start, or fall back to cold-start logic when a user skipped
 * everything optional.
 */
module.exports = {
  name: 'user_onboarding',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS user_onboarding (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

      -- optional: free-text titles, no matching against the books table
      books_read TEXT[],

      -- optional: free-text genre tags
      genres TEXT[],

      -- required
      reader_status VARCHAR(30) NOT NULL CHECK (
        reader_status IN ('LOOKING_FORWARD', 'ACTIVE', 'RETURNING_FROM_BREAK')
      ),

      -- required only when reader_status isn't LOOKING_FORWARD
      recent_book_duration_days INTEGER,
      recent_book_pace VARCHAR(20) CHECK (
        recent_book_pace IS NULL OR recent_book_pace IN ('FASTER', 'SLOWER', 'ON_TIME')
      ),

      -- optional: free-text author names
      favorite_authors TEXT[],

      completed_at TIMESTAMP DEFAULT NOW(),

      -- mirrors the frontend rule: recent-book questions are only required
      -- once the user isn't brand new to reading.
      CONSTRAINT recent_book_info_required_unless_new_reader CHECK (
        reader_status = 'LOOKING_FORWARD'
        OR (recent_book_duration_days IS NOT NULL AND recent_book_pace IS NOT NULL)
      )
    );`,
  ],
};