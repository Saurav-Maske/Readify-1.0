# Readify API Reference

Base URL: `http://localhost:5000/api` (or your deployed host)

All request/response bodies are JSON unless noted otherwise. Protected
routes require a header:
Authorization: Bearer <token>
---

## Auth

### `GET /auth/check-username?username=janedoe`
Live-check as the user types on a signup form (debounce ~300-500ms).

Checks, in order: format validity (3-20 chars, letters/numbers/underscore),
the permanent `users` table, and the `temp_users` table (catches a name
someone else has reserved mid-signup but hasn't OTP-verified yet).

**Response**
```json
{ "available": true }
```
```json
{ "available": false, "reason": "Username is already taken." }
```
> Convenience check only — the real guarantee is a DB-level unique index, so
> a race between two simultaneous signups still ends in one clean `409`.

---

### `POST /auth/signup`
```json
{ "name": "Jane Doe", "username": "janedoe", "gmail": "jane@example.com", "password": "secret123" }
```
Hashes the password, stores the signup in `temp_users` with a 6-digit OTP,
emails the OTP. Returns `201`. Nothing is written to `users` yet.

**Response**
```json
{ "message": "OTP sent to email. Verify to complete signup." }
```

---

### `POST /auth/verify-otp`
```json
{ "gmail": "jane@example.com", "otp": "123456" }
```
If the OTP matches and hasn't expired (10 min), creates the real `users` row,
deletes the temp row.

**Response**
```json
{ "token": "<jwt>", "user": { "userId": 1, "name": "Jane Doe", "username": "janedoe", "gmail": "jane@example.com" } }
```

---

### `POST /auth/resend-otp`
```json
{ "gmail": "jane@example.com" }
```
Generates a new OTP for an existing pending signup and re-sends it.

---

### `POST /auth/login`
```json
{ "gmail": "jane@example.com", "password": "secret123" }
```
**Response:** same shape as `verify-otp` — `{ token, user }`.

---

### Frontend integration notes — Google Sign-In

1. Set up [Google Identity Services](https://developers.google.com/identity/gsi/web)
   on the frontend using the **same** `GOOGLE_CLIENT_ID` as the backend `.env`.
2. Render the Google button/One Tap prompt. On successful sign-in, Google
   calls your callback with a `response.credential` — this is a signed JWT
   ID token, proving the user's Google identity (email, name, Google ID).
3. Send that token as-is to the backend:
```javascript
   const res = await fetch(`${API_BASE}/auth/google`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ idToken: response.credential }),
   });
   const data = await res.json();
```
4. Branch on the response:
   - Has `token` → user is fully logged in (covers both an existing Google
     account and an existing local account with a matching email). Store
     the token.
   - Has `needsUsername: true` → brand-new Google user. Show a "choose a
     username" screen, keeping `pendingToken` (and optionally `name`/`gmail`
     for display) around, then call:
```javascript
     const res = await fetch(`${API_BASE}/auth/google/complete-signup`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ pendingToken, username: chosenUsername }),
     });
```

**One-time setup checklist (Google Cloud Console):**
- OAuth consent screen configured (External user type, your test account
  added under "Test users" while unpublished).
- OAuth Client ID created as **Web application**, with every frontend origin
  (e.g. `http://localhost:3000`, your prod domain) listed under **Authorized
  JavaScript origins**. No redirect URIs needed — this flow doesn't use them.
- The same Client ID goes in the backend's `GOOGLE_CLIENT_ID` and the
  frontend's `initialize({ client_id })` / `data-client_id` — they must match
  exactly, or verification fails silently in the browser before your backend
  even sees a request.
  
### `POST /auth/google`
```json
{ "idToken": "<Google ID token from the frontend Sign-In button>" }
```
- Existing Google account/email → `{ token, user }` immediately (covers login
  and reusing an existing account).
- Brand new Google user → `{ needsUsername: true, pendingToken, name, gmail }`.
  Frontend should show a "choose a username" screen, then call the next endpoint.

---

### `POST /auth/google/complete-signup`
```json
{ "pendingToken": "<from the /auth/google response>", "username": "janedoe" }
```
Creates the real `users` row (name/email/Google ID come from the stashed temp
record; only the username is new).

**Response:** `{ token, user }`

---

### `GET /auth/me` 🔒 *protected*
Returns the logged-in user's public profile.

**Response**
```json
{ "user": { "userId": 1, "name": "Jane Doe", "username": "janedoe", "gmail": "jane@example.com" } }
```

---

## Password reset

Flow: check email exists → collect new password → send OTP → verify OTP → password is applied.

### `GET /auth/check-gmail?gmail=jane@example.com`
Frontend calls this on the "forgot password" form before showing the
new-password field.

**Response**
```json
{ "exists": true }
```
> Note: unlike signup/login errors, this endpoint does confirm whether an
> email is registered — that's a deliberate tradeoff for this UX. Don't reuse
> this pattern for anything more sensitive without discussing it first.

---

### `POST /auth/forgot-password`
```json
{ "gmail": "jane@example.com", "newPassword": "newSecret123" }
```
Hashes `newPassword` and stashes it alongside a fresh OTP in `temp_users`
(`signup_type = 'reset'`). Emails the OTP. **Nothing changes in `users` yet.**

**Response**
```json
{ "message": "OTP sent to email. Verify to complete password reset." }
```

---

### `POST /auth/verify-reset-otp`
```json
{ "gmail": "jane@example.com", "otp": "123456" }
```
Validates the OTP, then copies the already-hashed password from `temp_users`
into the real `users` row, and deletes the temp row.

**Response**
```json
{ "message": "Password updated successfully. Please log in." }
```

**Errors:** `404` no reset request found · `410` OTP expired · `400` incorrect OTP

---

## Onboarding

### `POST /users/reading-preferences` 🔒 *protected*
Saves the user's answers to the onboarding questionnaire (shown once,
right after signup) and marks onboarding as complete for this user.

```json
{
  "readerStatus": "returning",
  "recentBookDuration": "2 weeks",
  "recentBookPace": "on_time",
  "genres": ["Fantasy", "Sci-Fi"],
  "booksRead": "Dune, Project Hail Mary, The Name of the Wind",
  "favoriteAuthors": "Brandon Sanderson, N.K. Jemisin"
}
```

- `readerStatus` — one of `starting` | `active` | `returning`, required.
- `recentBookDuration` / `recentBookPace` — required unless `readerStatus`
  is `starting`. Duration accepts a number or number-word plus an optional
  unit (`"2 weeks"`, `"ten days"`, `"1 month"` — bare numbers are treated
  as days).
- `genres` — array of strings, required (can be empty).
- `booksRead` / `favoriteAuthors` — free text, comma- or newline-separated;
  split into arrays server-side. Both optional.

Upserts — calling this again (e.g. from an "edit preferences" screen)
overwrites the previous answers rather than erroring.

**Response**
```json
{ "message": "Reading preferences saved.", "onboardingComplete": true }
```
**Errors:** `400` invalid/missing `readerStatus`, `genres`, or duration

---

## Profile

All three routes below work for logged-out visitors — they use optional
auth, not required auth. If a valid `Authorization: Bearer <token>` header
is sent, the response is tailored to who's asking; if not, the viewer is
treated as a stranger.

**Visibility rule** for `posts` and `quotes` (filtered by a `visibility`
column), based on the viewer's relationship to the profile owner:

| relationship | sees |
|---|---|
| `self` (own profile) | PUBLIC + PRIVATE + JUST_ME |
| `friend` (mutual follow — both users follow each other) | PUBLIC + PRIVATE |
| `stranger` (everyone else, incl. logged-out) | PUBLIC only |

In practice this only matters for `posts` right now — `POST /quotes`
doesn't accept a `visibility` field, so every quote is `PUBLIC` and visible
to everyone regardless of relationship.

`reviews` are not part of this system — a review is essentially a post
with a rating attached, and is always public regardless of relationship.

---

### `GET /users/:username`
Core profile info + counts. `relationship` tells the frontend which of the
three tiers above applies to this viewer.

**Response**
```json
{
  "user": {
    "userId": 1, "name": "Jane Doe", "username": "janedoe",
    "profilePicture": null, "bio": "..."
  },
  "isOwnProfile": true,
  "relationship": "self",
  "followersCount": 42,
  "followingCount": 17,
  "reviewsCount": 5
}
```
`gmail` and `isFirstLogin` are only included in `user` when `isOwnProfile`
is `true`.

---

### `GET /users/:username/quotes?limit=3`
Most recent quotes, newest first, filtered by the visibility rule above.
No book association (quotes aren't linked to a book) and no `visibility`
field in the response — the query filters by visibility, but only
`quoteId`, `quote`, and `createdAt` are actually returned.

**Response**
```json
{
  "quotes": [
    { "quoteId": 12, "quote": "...", "createdAt": "..." }
  ]
}
```

---

### `GET /users/:username/posts?limit=3&offset=0`
Paginated, filtered by the visibility rule above. Each post includes its
like count (post likes only). No comments included.

Call once with `limit=3&offset=0` for a fast first paint, then again with a
larger `limit` and `offset=3` to load the rest.

**Response**
```json
{
  "posts": [
    {
      "postId": 8, "caption": "...", "visibility": "PUBLIC",
      "createdAt": "...", "likeCount": 4, "book": null
    }
  ],
  "limit": 3,
  "offset": 0,
  "hasMore": true
}
```
> `book` is always `null` — posts haven't been linked to a book since
> `posts.book_id` was dropped from the schema, but the response still
> includes the (now dead) field.

---

### `GET /users/:username/reviews?limit=3&offset=0`
Paginated, always public — no relationship check applied. Same response
shape as `posts` above, with `reviewId`, `rating`, `review` instead of
`postId`/`caption`, and no `visibility` or `likeCount` fields. `book` also
carries `rating` (the book's average across all its reviews) and
`noOfRatings` — don't confuse this with the top-level `rating`, which is
this specific reviewer's own score.

### `PATCH /users/me` 🔒 *protected, multipart/form-data*
Update your own bio and/or profile picture. Only fields actually sent are changed.

**Fields**
- `bio` (text, optional) — max 500 characters
- `profilePicture` (file, optional) — JPEG/PNG/WEBP/GIF, max 5MB

**Response**
```json
{ "user": { "userId": 1, "name": "...", "username": "...", "gmail": "...", "profilePicture": "/uploads/profile-pictures/...", "bio": "...", "isFirstLogin": false } }
```
**Errors:** `400` bio too long or invalid image type/size · `404` user not found

---

## Follow

### `POST /users/:username/follow` 🔒 *protected*
Follow the given user. Idempotent — following someone you already follow
just returns the current state instead of erroring.

**Response**
```json
{ "following": true, "followersCount": 43 }
```
**Errors:** `400` can't follow yourself · `404` user not found

---

### `DELETE /users/:username/follow` 🔒 *protected*
Unfollow the given user. Also idempotent.

**Response**
```json
{ "following": false, "followersCount": 42 }
```
**Errors:** `404` user not found

---

## My Shelf

Three independent lists per user — `currently-reading` (at most one book,
`current_reading.user_id` is unique), `want-to-read` (`wishlist`), and
`finished` (`reading_history`, `finished_at` set). All four routes are
`🔒 protected` and always scoped to the logged-in user (`req.user`) —
there's no `:username` version of these.

### `GET /users/me/shelf`
**Response**
```json
{
  "currently-reading": [
    { "bookId": 3, "title": "Dune", "author": "Frank Herbert", "coverImage": "...", "startedAt": "..." }
  ],
  "want-to-read": [
    { "bookId": 7, "title": "...", "author": "...", "coverImage": "...", "savedAt": "..." }
  ],
  "finished": [
    { "bookId": 1, "title": "...", "author": "...", "coverImage": "...", "startedAt": "...", "finishedAt": "..." }
  ]
}
```

---

### `POST /users/me/shelf`
```json
{ "status": "want-to-read", "bookId": 3 }
```
Or, for a book not yet in the system, `title`/`author` instead of `bookId`
(same find-or-create behavior as `POST /reviews` — see `/books/lookup`
flow above). Optional `genre`, `publishedDate`, `coverImage` are only used
when a new book is actually created this way.

- `status` — one of `currently-reading` | `want-to-read` | `finished`, required.
- `bookId`, or `title` + `author`, required.

Adding a book that's already `currently-reading` replaces whatever book was
there before (only one at a time per user) rather than erroring. Adding a
book already on the shelf for the same status is otherwise idempotent
(`want-to-read` uses `ON CONFLICT DO NOTHING`).

**Response** — `201`
```json
{ "book": { "bookId": 3, "title": "Dune", "author": "Frank Herbert", "coverImage": "..." }, "status": "want-to-read" }
```
**Errors:** `400` invalid/missing `status`, missing book info, or `bookId` not an integer · `404` book not found

---

### `PATCH /users/me/shelf/:bookId/finish`
Moves a book from `currently-reading` to `finished`. If it wasn't already
in `currently-reading`, it's still added straight to `finished` — both
`startedAt` and `finishedAt` are then "now".

**Response**
```json
{ "finished": { "bookId": 3, "startedAt": "...", "finishedAt": "..." } }
```
**Errors:** `400` bookId not an integer

---

### `DELETE /users/me/shelf/:status/:bookId`
Removes a book from the given shelf tab. `status` selects which table
(`currently-reading` / `want-to-read` / `finished`) to delete from.

**Response** — `204 No Content`
**Errors:** `400` invalid `status` or bookId not an integer · `404` not on that shelf

---

## Books

### `GET /books/:bookId`
Fetch a single book's info (catalog or user-submitted).

**Response**
```json
{
  "book": {
    "bookId": 3, "title": "Dune", "author": "Frank Herbert",
    "genre": "Sci-Fi", "publishedDate": "1965-08-01",
    "coverImage": "https://...", "rating": 4.6, "noOfRatings": 128,
    "source": "catalog"
  }
}
```
**Errors:** `400` bookId not an integer · `404` book not found

---

### `GET /books/:bookId/reviews?limit=10&offset=0`
Community reviews for this book — always public, newest first. Used by the
book detail page. Not the same as `GET /users/:username/reviews`, which
goes the other way (one user's reviews across every book).

**Response**
```json
{
  "reviews": [
    {
      "reviewId": 12, "rating": 4.5,
      "review": "Loved the world-building, pacing dragged in the middle.",
      "createdAt": "...",
      "reviewer": { "userId": 7, "name": "Jane Doe", "username": "janedoe", "profilePicture": "/uploads/profile-pictures/..." }
    }
  ],
  "limit": 10, "offset": 0, "hasMore": false
}
```
`reviewer.profilePicture` is a relative path (or `null`); prefix it with the
API origin the same way `users.profilePicture` is handled elsewhere.

**Errors:** `400` bookId not an integer

---

### `GET /books/lookup?title=dune&limit=8`
> Not the general book/user discovery search — see `GET /search` below for
> that. This is the narrow, compose-time lookup used by the
> review creation screen — see below, `posts` and `quotes` don't take a
> book at all anymore.

Call this as the user types a book title while creating a review. Matches
on title or author, catalog books ranked first.

**Frontend flow:**
1. User types a title → call this endpoint → show the matches.
2. User taps a match → autofill the author field from it, and send that
   book's `bookId` when creating the review.
3. No match / user ignores suggestions → let them type title + author
   manually and send those instead of `bookId`. `POST /reviews` looks for
   an existing book with that exact title+author first, and only creates a
   new `user_submitted` book if none exists — so the same not-yet-
   catalogued book doesn't get duplicated every time someone reviews it
   again.

**Response**
```json
{
  "books": [
    { "bookId": 3, "title": "Dune", "author": "Frank Herbert", "genre": "Sci-Fi", "publishedDate": "1965-08-01", "coverImage": "https://...", "rating": 4.6, "noOfRatings": 128, "source": "catalog" }
  ]
}
```
**Errors:** `400` missing `title` query param

---

## Search

### `GET /search?q=...&limit=20`
The general discovery search behind the frontend's search bar. One query
param, two possible result shapes — decided purely by whether `q` starts
with `@`:

| `q` | searches | matches on |
|---|---|---|
| starts with `@` (e.g. `@jane`) | people | `users.username` / `users.name`, ILIKE, `@` stripped before querying |
| anything else (e.g. `dune`) | books | `books.title` / `books.author`, ILIKE — same matcher as `/books/lookup` |

Works logged-out (`optionalAuth`) — a user search only gets `isSelf`/
`isFollowing` filled in when a valid token is sent; without one, every
result has `isSelf: false, isFollowing: false`.

**Response — user search (`q=@jane`)**
```json
{
  "mode": "users",
  "query": "@jane",
  "results": [
    { "userId": 1, "name": "Jane Doe", "username": "janedoe", "profilePicture": null, "bio": "...", "isSelf": false, "isFollowing": true }
  ]
}
```

**Response — book search (`q=dune`)**
```json
{
  "mode": "books",
  "query": "dune",
  "results": [
    { "bookId": 3, "title": "Dune", "author": "Frank Herbert", "genre": "Sci-Fi", "publishedDate": "1965-08-01", "coverImage": "https://...", "rating": 4.6, "noOfRatings": 128, "source": "catalog" }
  ]
}
```
**Errors:** `400` missing/empty `q` query param

---

## Posts

Posts are **not** linked to a book — there's no book/title/author field
anywhere in this endpoint (that used to be true; `posts.book_id` has since
been dropped from the schema).

### `POST /posts` 🔒 *protected*
```json
{
  "caption": "Just finished this, wow.",
  "visibility": "PUBLIC"
}
```
- `caption` — string, required (must have non-whitespace content).
- `visibility` — one of `PUBLIC` | `PRIVATE` | `JUST_ME`, required.

**Response** — `201`
```json
{
  "post": {
    "postId": 8, "caption": "Just finished this, wow.", "visibility": "PUBLIC",
    "createdAt": "...", "likeCount": 0
  }
}
```
**Errors:** `400` invalid/missing `visibility` · `400` missing `caption`

---

### `DELETE /posts/:postId` 🔒 *protected*
Deletes your own post. Ownership is enforced server-side — trying to
delete someone else's post returns `404`, same as it not existing at all.

**Response** — `204 No Content`
**Errors:** `400` postId not an integer · `404` not found / not yours

---

## Reviews

### `POST /reviews` 🔒 *protected*
```json
{
  "rating": 4.5,
  "review": "Loved the world-building, pacing dragged in the middle.",
  "bookId": 3
}
```
Or, for a book not yet in the system (see `/books/lookup` flow above),
`title`/`author` instead of `bookId`:
```json
{
  "rating": 4.5,
  "review": "Loved the world-building, pacing dragged in the middle.",
  "title": "Some Indie Novel",
  "author": "Jane Q. Author"
}
```
`reviews.book_id` is required at the DB level, so either `bookId` or
`title`+`author` must be given. Optional `genre`, `publishedDate`,
`coverImage` are used only when a new book is actually created this way.
Reviews are the only endpoint that still works with books this way —
`posts` and `quotes` dropped book association entirely.

- `rating` — number, `0`–`5`, required.
- `review` — text, required.

Creating (or deleting) a review recalculates the book's stored average
rating (`books.rating`) and rating count (`books.no_of_ratings`) from all
of its reviews, so the book's average is always kept in sync.

**Response** — `201`
```json
{
  "review": {
    "reviewId": 12, "rating": 4.5,
    "review": "Loved the world-building, pacing dragged in the middle.",
    "createdAt": "...",
    "book": { "bookId": 3, "title": "Dune", "author": "Frank Herbert", "rating": 4.2, "noOfRatings": 131 }
  }
}
```
`review.rating` is this reviewer's own score; `review.book.rating` is the
book's average across all reviews (updated to include this one).

**Errors:** `400` invalid rating/review, or missing book info · `404` book not found

---

### `DELETE /reviews/:reviewId` 🔒 *protected*
Deletes your own review. Same ownership-enforced-server-side behavior as
`DELETE /posts/:postId`. The book's average rating and rating count are
recalculated afterward.

**Response** — `204 No Content`
**Errors:** `400` reviewId not an integer · `404` not found / not yours

---

## Quotes

Quotes are **not** linked to a book (same as posts — `quotes.book_id` has
been dropped from the schema).

### `POST /quotes` 🔒 *protected*
```json
{
  "quote": "Fear is the mind-killer."
}
```
- `quote` — text, required.
- There is no `visibility` field on this endpoint. Every quote created
  through the API defaults to `PUBLIC` (the DB column default) — the
  request body's `visibility`, if sent, is ignored.

**Response** — `201`
```json
{
  "quote": {
    "quoteId": 12, "quote": "Fear is the mind-killer.", "visibility": "PUBLIC",
    "createdAt": "..."
  }
}
```
**Errors:** `400` missing `quote`

---

### `DELETE /quotes/:quoteId` 🔒 *protected*
Deletes your own quote. Same ownership-enforced-server-side behavior as
`DELETE /posts/:postId` and `DELETE /reviews/:reviewId`.

**Response** — `204 No Content`
**Errors:** `400` quoteId not an integer · `404` not found / not yours

---

## Feed

All feed endpoints are protected — they rank/filter relative to the logged-
in viewer, so there is no logged-out feed.

### GET /feed?limit=20\&offset=0 🔒 *protected*
Merged, ranked posts + reviews from everyone except the viewer. Visibility
follows the same rule as GET /users/:username/posts (PUBLIC always,
PRIVATE only from friends/mutual-follows, JUST_ME never shown to anyone
else) — reviews have no visibility tiers, so every review is eligible.

Ranking blends cosine similarity (viewer taste vector vs. the reviewed
book — posts have no book, so similarity contributes 0 for posts), recency
decay, recent-likes engagement, a boost for authors the viewer
follows/friends, a boost scaled by the author's follower count, and a flat
boost for readify_ai (user_id = 0). See src/controllers/feedController.js
for the exact weights.

**Response**
json
{
  "items": [
    {
      "type": "post",
      "postId": 41, "caption": "...", "visibility": "PUBLIC", "createdAt": "...",
      "likeCount": 3, "likedByMe": false, "commentCount": 1,
      "author": { "userId": 7, "name": "Jane Doe", "username": "janedoe", "profilePicture": null },
      "book": null
    },
    {
      "type": "review",
      "reviewId": 12, "rating": 4.5, "review": "...", "createdAt": "...",
      "likeCount": 9, "likedByMe": true, "commentCount": 2,
      "author": { "userId": 3, "name": "Alex Kim", "username": "alexk", "profilePicture": null },
      "book": { "bookId": 3, "title": "Dune", "author": "Frank Herbert", "coverImage": null, "rating": 4.2, "noOfRatings": 131 }
    }
  ],
  "limit": 20, "offset": 0, "hasMore": true
}

---

### GET /feed/quotes 🔒 *protected*
Quotes posted in the last 24 hours by friends (mutual follows) of the
viewer only — a quote from anyone else, however recent, is excluded.

**Response**
json
{
  "quotes": [
    {
      "quoteId": 55, "quote": "Fear is the mind-killer.", "createdAt": "...",
      "likeCount": 2, "likedByMe": false,
      "author": { "userId": 9, "name": "Maya Chen", "username": "maya.reads", "profilePicture": null }
    }
  ]
}

---

### GET /feed/trending-books?limit=10 🔒 *protected*
Books with review/like activity in the last 7 days, ranked by a blend of
that activity and cosine similarity to the viewer's taste vector — so
"trending" is popularity-this-week re-weighted toward what this particular
viewer is likely to care about, not a single global list.

**Response**
json
{
  "books": [
    { "rank": 1, "bookId": 3, "title": "Dune", "author": "Frank Herbert", "genre": "Sci-Fi", "coverImage": null, "rating": 4.2, "noOfRatings": 131 }
  ]
}

---

### GET /feed/connections?limit=5 🔒 *protected*
"Readers to follow" — users the viewer doesn't already follow, ranked by
cosine similarity between the viewer's and each candidate's taste vector.
Excludes readify_ai (user_id = 0) — it's a system account, not a person
to follow. `reviewCount` is the candidate's total number of reviews.

**Response**
json
{
  "readers": [
    { "userId": 14, "name": "Dev Sharma", "username": "devreads", "profilePicture": null, "reviewCount": 22 }
  ]
}