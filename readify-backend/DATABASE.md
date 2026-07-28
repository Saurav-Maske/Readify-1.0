# Readify Database

## Scalable startup process (schema modules)

`src/db/init.js` runs on every server start and doesn't contain any table
definitions itself — it just loops over `src/db/schema/index.js`:

```
src/db/schema/
  users.schema.js
  tempUsers.schema.js
  books.schema.js
  followers.schema.js
  currentReading.schema.js
  readingHistory.schema.js
  wishlist.schema.js
  posts.schema.js
  quotes.schema.js
  likes.schema.js
  comments.schema.js
  reviews.schema.js
  userOnboarding.schema.js
  index.js              # registers all of the above, in dependency order
```

Each module exports `{ name, temporary, sql: [...] }`:
- `temporary: false` → created with `CREATE TABLE IF NOT EXISTS` (data survives restarts)
- `temporary: true` → dropped and recreated every restart (always empty) — only `temp_users` uses this

**To add a new table as the product grows**: create
`src/db/schema/<table>.schema.js` in the same shape, then add it to the
array in `src/db/schema/index.js`, placed *after* any table it has a foreign
key to. `init.js` itself never needs to change. Once the schema gets complex
enough to want proper up/down migrations and rollback history, this registry
is the natural place to swap in a tool like `node-pg-migrate` without
touching the rest of the app.

---

## Tables

### `users` (permanent)
| column | notes |
|---|---|
| user_id | PK |
| name | |
| username | unique (case-insensitive) |
| gmail | unique (case-insensitive) |
| password | bcrypt hash, nullable (null for Google-only accounts) |
| google_id | unique, nullable (null for local-only accounts) |
| profile_picture | nullable, empty until set from the profile page |
| bio | nullable, empty until set from the profile page |
| is_first_login | boolean, defaults `true`. Flipped to `false` the first time the user completes any login-type flow (`verify-otp`, `login`, `google`, `google/complete-signup`). Never flipped by `GET /me` — checking your own profile isn't a login. |
| created_at | |

**Seeded system account:** `users.schema.js` inserts a fixed row at
`user_id = 0` ("Readify AI" / `readify_ai`) on every server start
(`ON CONFLICT (user_id) DO NOTHING`, so it's created once and left alone
after that — except its `profile_picture`/`bio` are re-synced on every
start if either was ever null). It has no `password`/`google_id` (not a
real login-capable account) and is used to attribute AI-generated content
such as auto-added catalog books. App code special-cases `userId === 0`
(e.g. `ProfilePage` only shows a Reviews tab, no Posts tab, for this user).

### `temp_users` (wiped on every restart — holding pen for unfinished signups/resets)
| column | used by |
|---|---|
| name, username, gmail, password | local signup, pending OTP verification |
| password | also reused by password-reset (`signup_type = 'reset'`) — holds the *new* hashed password until OTP verification |
| otp, otp_expires_at | local signup OTP check, password-reset OTP check |
| google_id, pending_token | Google signup, pending username choice |
| signup_type | `'local'`, `'google'`, or `'reset'` |

For `'reset'` rows, `username` and `google_id` are left `NULL` — the partial
unique index on `username` (`WHERE signup_type = 'local' AND username IS NOT
NULL`) doesn't apply to those rows, so no schema change was needed to
support password reset.

### `books` (permanent)
| column | notes |
|---|---|
| book_id | PK |
| title | |
| author | |
| genre | |
| published_date | |
| cover_image | |
| rating | numeric(2,1), defaults 0 |
| no_of_ratings | integer default 0 |
| source | `'catalog' \| 'user_submitted'`, defaults `'catalog'` — see note below |
| added_by | FK → users, nullable (`SET NULL` on user deletion) — who submitted it, if `source = 'user_submitted'` |
| created_at | |

**Unknown books:** when a user reviews a book that isn't in your catalog,
a bare-bones row is created here (`source = 'user_submitted'`, just title +
author, no cover/genre/rating) instead of allowing a null `book_id`
anywhere else in the schema. `reviews.book_id` is only *required in
practice* — `POST /api/reviews` rejects a request that has neither
`bookId` nor `title`+`author` before it ever reaches the database — the
column itself has no `NOT NULL` constraint at the DB level (unlike
`posts.visibility`, which is `NOT NULL` in the schema). Either way, every
review that does get created points at a real `book_id`, so the
recommendation model just filters or
down-weights by `source` instead of every query having to special-case
missing books. When the book is later matched to real catalog data, you
just `UPDATE books SET source = 'catalog', ... WHERE book_id = X` — nothing
else in the database needs to change, since every reference already points
at that same stable `book_id`.

The find-or-create lookup is built: `bookModel.resolveBook` (case-
insensitive exact title+author match, or create a new `user_submitted` row)
backs `POST /api/reviews` when the client sends `title`/`author` instead of
`bookId`. **Only reviews use this** — `posts` and `quotes` dropped their
`book_id` column entirely and no longer reference `books` at all, so
`wishlist` and `reviews` are currently the only tables with a live FK into
`books`.

### `followers` (permanent)
| column | notes |
|---|---|
| follow_id | PK |
| follower_id | FK → users, the one doing the following |
| following_id | FK → users, the one being followed |
| created_at | |

`UNIQUE(follower_id, following_id)` prevents duplicate follows.
`CHECK (follower_id <> following_id)` prevents self-follows.

Follower/following counts:
```sql
-- followers of user X
SELECT COUNT(*) FROM followers WHERE following_id = X;
-- who user X follows
SELECT COUNT(*) FROM followers WHERE follower_id = X;
```
Both columns are indexed since these counts run constantly.

### `current_reading` (permanent)
| column | notes |
|---|---|
| id | PK |
| user_id | FK → users, **unique** — one current book per user |
| book_id | FK → books |
| started_at | |

### `reading_history` (permanent)
| column | notes |
|---|---|
| history_id | PK |
| user_id | FK → users |
| book_id | FK → books |
| started_at, finished_at | both nullable |

### `wishlist` (permanent)
| column | notes |
|---|---|
| wishlist_id | PK |
| user_id | FK → users |
| book_id | FK → books |
| saved_at | |

`UNIQUE(user_id, book_id)` — can't wishlist the same book twice.

### `posts` (permanent)
| column | notes |
|---|---|
| post_id | PK |
| user_id | FK → users |
| caption | |
| visibility | `'PUBLIC' \| 'PRIVATE' \| 'JUST_ME'`, `NOT NULL` |
| created_at | |

Posts are no longer linked to a book — there's no `book_id` column.
`POST /api/posts` only accepts `caption` + `visibility`.

### `quotes` (permanent)
| column | notes |
|---|---|
| quote_id | PK |
| user_id | FK → users |
| quote | |
| visibility | `TEXT DEFAULT 'PUBLIC'` — unlike `posts.visibility`, this is **not**
`NOT NULL` and has no `CHECK` restricting it to `PUBLIC \| PRIVATE \|
JUST_ME` at the DB level |
| created_at | |

Quotes are no longer linked to a book — there's no `book_id` column.
`POST /api/quotes` only accepts `quote` text; it doesn't read `visibility`
from the request body, so every quote created through the API is `PUBLIC`
by default. `PRIVATE`/`JUST_ME` quotes would currently have to be set
directly in the database.

### `likes` (permanent) — supports liking posts, quotes, **and** reviews
| column | notes |
|---|---|
| like_id | PK |
| user_id | FK → users |
| post_id | FK → posts, nullable |
| quote_id | FK → quotes, nullable |
| review_id | FK → reviews, nullable |
| created_at | |

`CHECK` constraint enforces exactly one of `post_id` / `quote_id` /
`review_id` is set per row — a like is on a post, a quote, or a review,
never more than one, never none.

Three **partial unique indexes** replace a single `UNIQUE(user_id, post_id)`:
```sql
CREATE UNIQUE INDEX unique_post_like ON likes(user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX unique_quote_like ON likes(user_id, quote_id) WHERE quote_id IS NOT NULL;
CREATE UNIQUE INDEX unique_review_like ON likes(user_id, review_id) WHERE review_id IS NOT NULL;
```
This is necessary because Postgres treats every `NULL` as distinct in a
`UNIQUE` constraint — a plain `UNIQUE(user_id, post_id)` would let a user
"like" the same quote or review unlimited times, since `post_id` is `NULL`
on all of those rows.

`likeController` + routes exist for all three targets (post/quote/review) —
see `POST|DELETE /api/posts/:postId/like`, `/api/quotes/:quoteId/like`, and
`/api/reviews/:reviewId/like`.

Quote likes no longer expire — the earlier 24-hour expiry background job has
been removed, so a liked quote behaves like any other like.

### `comments` (permanent) — supports replies
| column | notes |
|---|---|
| comment_id | PK |
| post_id | FK → posts, **required** |
| review_id | FK → reviews, nullable — set when this comment is (also) attached to a review |
| user_id | FK → users |
| parent_comment_id | FK → comments (self-reference), nullable — set when this comment is a reply |
| comment | |
| created_at | |

`post_id` stays `NOT NULL` even on comments that also carry a `review_id` —
the schema hasn't been changed to make a comment postable against a review
alone.

### `reviews` (permanent)
| column | notes |
|---|---|
| review_id | PK |
| user_id | FK → users |
| book_id | FK → books |
| rating | numeric(2,1), `CHECK (rating BETWEEN 0 AND 5)` |
| review | |
| created_at | |

### `user_onboarding` (permanent) — one row per user, first-login survey
| column | notes |
|---|---|
| id | PK |
| user_id | FK → users, **unique** |
| books_read | `TEXT[]`, optional — free-text titles, **not** matched against `books`; no `book_id` involved |
| genres | `TEXT[]`, optional — free-text genre tags |
| reader_status | required: `'LOOKING_FORWARD' \| 'ACTIVE' \| 'RETURNING_FROM_BREAK'` |
| recent_book_duration_days | nullable — required unless `reader_status = 'LOOKING_FORWARD'` |
| recent_book_pace | nullable, `'FASTER' \| 'SLOWER' \| 'ON_TIME'` — required unless `reader_status = 'LOOKING_FORWARD'` |
| favorite_authors | `TEXT[]`, optional — free-text author names |
| completed_at | |

A `CHECK` constraint mirrors the frontend's conditional-required rule at the
DB level: `recent_book_duration_days` and `recent_book_pace` must both be
non-null unless `reader_status = 'LOOKING_FORWARD'`.

Nothing here is relationally matched to `books` — every field is plain
user-typed text stored as-is. The recommendation model reads this directly
to avoid a cold start (or falls back to cold-start logic for any user who
skipped the optional fields).

---

## Feed, trending books & connections

`src/models/tasteModel.js` builds cosine-similarity taste vectors (genre +
author terms, TF-weighted, rating-weighted for reviews) for users and books.
`src/models/feedModel.js` pulls bounded candidate pools (posts, reviews,
friend quotes, trending-book activity, connection candidates) and
`src/controllers/feedController.js` scores/ranks them:

- `GET /api/feed` — posts + reviews from everyone except the viewer,
  respecting the same PUBLIC/PRIVATE/JUST_ME visibility rule as
  `profileController`, ranked by a blend of cosine similarity, recency
  decay, recent-likes engagement, a friend/following boost, author
  follower-count influence, and a `readify_ai` (user_id 0) boost.
- `GET /api/feed/quotes` — quotes from the last 24 hours posted by friends
  (mutual follows only).
- `GET /api/feed/trending-books` — books with review/like activity in the
  last 7 days, re-weighted by similarity to the viewer's taste.
- `GET /api/feed/connections` — "readers to follow", ranked by cosine
  similarity between the viewer's and each candidate's taste vector.

v1 note: vectors are computed live per request rather than precomputed/
cached, and similarity uses raw TF weighting rather than full TF-IDF against
the book corpus. Both are flagged as the natural next steps if this needs to
scale further — see the comments atop `tasteModel.js`.

---

## Design notes / open questions to revisit later

- **Unknown books**: schema support (`books.source` / `books.added_by`) and
  the find-or-create helper (`bookModel.resolveBook`) are both in place and
  wired into `POST /api/reviews`. `posts` and `quotes` no longer take a
  book at all, so extending unknown-book support to those (or to
  `wishlist`) is the remaining piece if that comes back as a feature.
- **`likes.review_id`**: schema and unique index exist, but there's no
  `likeController`/routes for any target (post, quote, or review) yet.