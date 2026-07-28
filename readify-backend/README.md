# Readify Backend

Node.js + Express + PostgreSQL backend for Readify. Handles user signup/login
(with email OTP verification) and Google sign-in/signup. Also handles forgot-password with an OTP-verification.

## Stack

- **Runtime:** Node.js, Express
- **Database:** PostgreSQL (via `pg`)
- **Auth:** JWT (`jsonwebtoken`), bcrypt password hashing
- **Email:** Nodemailer (for OTP delivery)
- **Google Sign-In:** `google-auth-library`

## Project structure

```
src/
  config/       # db pool, google auth client
  controllers/  # request handlers 
  routes/       # express routers
  models/       # raw SQL queries against readify table
  middleware/   # JWT auth guard, error handler
  utils/        # hashing, otp, jwt, mailer helpers
  db/init.js    # initial server configurations
  app.js        # express app config
  server.js     # entry point
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
3. Make sure Postgres is running and the database in `DB_NAME` exists
   (`createdb readify` or via a GUI tool).
4. Run the server:
   ```bash
   npm run dev   
   # or
   npm start
   ```

On every start, `src/db/init.js` runs automatically: initialising the server and clearing cache.

## Live username availability check
Call this from the frontend as the user types (debounce ~300ms so you're
not hitting the API on every keystroke). It checks, in order:

1. Format (3-20 chars, letters/numbers/underscore - see `src/utils/usernameUtil.js`)
2. The permanent `users` table (already-registered accounts)
3. The `temp_users` table (someone else mid-signup who has already claimed
   that name but hasn't verified their OTP yet)

Response:
```json
{ "available": true }
```
or
```json
{ "available": false, "reason": "Username is already taken." }
```

This is a **convenience check**, not the only line of defense - two people
could still both check "available" at the same instant and then both submit.
That race is closed at the database level: `users.username` and
`temp_users.username` (for local signups) both have case-insensitive unique
indexes (see `src/db/schema/`), so the second insert fails and the controller
turns that into a clean `409 Username is already taken` instead of a crash.

## Feed

`GET /api/feed`, `/api/feed/quotes`, `/api/feed/trending-books`, and
`/api/feed/connections` are all handled in `src/controllers/feedController.js`
(queries live in `src/models/feedModel.js`). All four are protected — every
one of them ranks or filters relative to the logged-in viewer, so there's no
generic/logged-out version of any of them.

- **`GET /feed`** — merges posts and reviews from everyone except the viewer
  (respecting the same PUBLIC/PRIVATE/JUST_ME visibility rule used on
  profiles) and ranks the combined list with a weighted blend: cosine
  similarity between the viewer's taste vector and the reviewed book (posts
  have no book, so similarity contributes 0 for them), recency decay,
  recent-likes engagement, a boost if the viewer follows the author, a boost
  scaled by the author's follower count, and a flat boost for `readify_ai`
  (user_id 0). Supports `limit`/`offset` paging and returns `hasMore`.
- **`GET /feed/quotes`** — quotes posted in the last 24 hours by the
  viewer's friends (mutual follows) only; nothing from one-sided follows or
  strangers, however recent.
- **`GET /feed/trending-books`** — books with review/like activity in the
  last 7 days, ranked by a blend of that recent activity and cosine
  similarity to the viewer's taste vector, so it's popularity-this-week
  re-weighted toward what this particular viewer is likely to care about
  rather than one global list for everyone.
- **`GET /feed/connections`** ("readers to follow") — users the viewer
  doesn't already follow, ranked purely by cosine similarity between the
  viewer's and each candidate's taste vector; `readify_ai` is excluded since
  it's a system account, not a person to follow.

The taste-vector building (`buildUserVector`/`buildBookVector`) lives in
`src/models/tasteModel.js`, and cosine similarity itself is in
`src/utils/similartiy.js`. Full request/response shapes are in
[API.md](./API.md#feed).

## More docs

- [API.md](./API.md) — full endpoint reference for frontend integration
- [DATABASE.md](./DATABASE.md) — schema modules and table design