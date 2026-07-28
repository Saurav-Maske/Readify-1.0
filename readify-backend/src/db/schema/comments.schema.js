module.exports = {
  name: 'comments',
  temporary: false,
  sql: [
    `CREATE TABLE IF NOT EXISTS comments (
      comment_id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
      review_id INTEGER REFERENCES reviews(review_id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      parent_comment_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    // post_id used to be NOT NULL, which meant a comment could never target
    // a review on its own. Dropping the NOT NULL (a no-op if it's already
    // nullable) plus the CHECK below brings comments in line with how likes
    // already handle "exactly one of post/review" - safe to run every start.
    `ALTER TABLE comments ALTER COLUMN post_id DROP NOT NULL;`,
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'comment_target_exactly_one'
       ) THEN
         ALTER TABLE comments ADD CONSTRAINT comment_target_exactly_one CHECK (
           (post_id IS NOT NULL AND review_id IS NULL) OR
           (post_id IS NULL AND review_id IS NOT NULL)
         );
       END IF;
     END $$;`,
    `CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);`,
    `CREATE INDEX IF NOT EXISTS idx_comments_review_id ON comments(review_id);`,
    // Fast "get replies to this comment" lookups.
    `CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);`,
  ],
};