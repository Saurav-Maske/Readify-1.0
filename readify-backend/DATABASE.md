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
| source | `'catalog' \| 'user_submitted'`, defaults `'catalog'` — see note below |
| added_by | FK → users, nullable (`SET NULL` on user deletion) — who submitted it, if `source = 'user_submitted'` |
| created_at | |

**Unknown books:** when a user posts/reviews/quotes a book that isn't in
your catalog, the plan is to create a bare-bones row here (`source =
'user_submitted'`, just title + author, no cover/genre/rating) instead of
allowing a null `book_id` anywhere else in the schema. Every FK across
`reviews`, `posts`, `quotes`, `wishlist`, etc. stays `NOT NULL` and points at
a real `book_id` either way — the recommendation model just filters or
down-weights by `source` instead of every query having to special-case
missing books. When the book is later matched to real catalog data, you
just `UPDATE books SET source = 'catalog', ... WHERE book_id = X` — nothing
else in the database needs to change, since every reference already points
at that same stable `book_id`.

The actual find-or-create lookup (matching a typed title/author against
existing books before creating a new one) isn't built yet — that's the next
piece, wired in whenever posts/reviews/quotes creation endpoints get built.

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
| book_id | FK → books |
| caption | |
| visibility | `'PUBLIC' \| 'PRIVATE' \| 'JUST_ME'` |
| created_at | |

### `quotes` (permanent)
| column | notes |
|---|---|
| quote_id | PK |
| user_id | FK → users |
| book_id | FK → books |
| quote | |
| visibility | `'PUBLIC' \| 'PRIVATE' \| 'JUST_ME'` |
| created_at | |

### `likes` (permanent) — supports liking posts **and** quotes
| column | notes |
|---|---|
| like_id | PK |
| user_id | FK → users |
| post_id | FK → posts, nullable |
| quote_id | FK → quotes, nullable |
| created_at | |

`CHECK` constraint enforces exactly one of `post_id` / `quote_id` is set per
row — a like is on a post *or* a quote, never both, never neither.

Two **partial unique indexes** replace a single `UNIQUE(user_id, post_id)`:
```sql
CREATE UNIQUE INDEX unique_post_like ON likes(user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX unique_quote_like ON likes(user_id, quote_id) WHERE quote_id IS NOT NULL;
```
This is necessary because Postgres treats every `NULL` as distinct in a
`UNIQUE` constraint — a plain `UNIQUE(user_id, post_id)` would let a user
"like" the same quote unlimited times, since `post_id` is `NULL` on all of
those rows.

**Quote likes expire after 24 hours; post likes don't.** See "Background
jobs" below — only the `likes` row is deleted, never the `quotes` row, so
liked quotes can resurface later as a "memories" feature.

### `comments` (permanent) — supports replies
| column | notes |
|---|---|
| comment_id | PK |
| post_id | FK → posts |
| user_id | FK → users |
| parent_comment_id | FK → comments (self-reference), nullable — set when this comment is a reply |
| comment | |
| created_at | |

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

## Background jobs

### Quote-like expiry
`src/jobs/cleanupQuoteLikes.js`, started from `server.js` right after
`initDb()`. Runs once immediately, then every hour for as long as the
process is alive:
```sql
DELETE FROM likes
WHERE quote_id IS NOT NULL
  AND created_at < NOW() - INTERVAL '24 hours';
```
Only `likes` rows are removed — `quotes` themselves are never touched, so a
liked quote can be resurfaced later (e.g. "this quote you liked a year
ago") even after the like itself has expired.

---

## Design notes / open questions to revisit later

- **Unknown books**: schema support (`books.source` / `books.added_by`) is in
  place. Still need the find-or-create helper (match typed title/author
  against existing `books` before creating a new `user_submitted` row) -
  build this alongside whichever of posts/reviews/quotes/wishlist creation
  endpoints comes first.