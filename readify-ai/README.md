# Readify AI - Discover Recommendation Engine

Generates the book recommendations shown on Readify's **Discover page**,
using a Heterogeneous Graph Attention Network (GAT) trained on live
Readify interaction data (current reading, reading history, wishlist,
followers, likes/comments on reviews). Also includes a manual CLI for
posting AI-written reviews as the `readify_ai` account (`user_id = 0`).

**This is deliberately the only place a GNN is used.** The Feed, Trending
Books, and Suggested Readers sidebar all run on a separate, simpler
cosine-similarity system that lives entirely in the Node backend
(`tasteModel.js` + `similarity.js` + `feedController.js`) - no Python
involved there at all. If you're looking for that code, it's not in this
repo.

---

## What's in this folder (and only this)

Everything below is what's actually used by the current pipeline. If a
file isn't listed here, it's either archived (`training/archive/`, kept
for reference only) or was removed because it belonged to an earlier,
now-replaced design (a Goodreads-bootstrap precompute pipeline that ran
on a schedule - see "Design history" at the bottom).

```
readify_ai/
├── data/
│   └── graph/
│       ├── graph.pt              # book/author/genre structure + content embeddings
│       └── lookup/
│           └── book_lookup.pkl   # {goodreads_slug: book_index}, used by sync_book_ids.py
├── jobs/
│   ├── db_utils.py               # Postgres connection + helpers
│   ├── apply_reviewed            # review rows to match from sync_book_ids.py
│   ├── sync_book_ids.py          # maps book_index (model) <-> book_id (Readify DB)
│   ├── build_and_train_discover_graph.py   # THE main script - see below
│   ├── generate_ai_reviews.py    # manual CLI: post one AI review as user_id=0
│   ├── gemini_key_rotation.py    # key rotation when you hit your daily limit
│   └── lookup_utils.py           # book_index -> readable title
├── .env.example
├── requirements.txt
└── README.md
```

---

## Setup

```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt --break-system-packages

copy .env.example .env         # fill in real values
```

`.env` needs:

```
GEMINI_API_KEY=...             # free tier, no card - ai.google.dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=readify
DB_USER=...
DB_PASSWORD=...
```

---

## Running order

```bash
# 1. One-time (and again any time books are bulk-imported into the catalog):
#    maps the model's internal book_index to Readify's real book_id.
python jobs/sync_book_ids.py

# 2. Whenever you want fresh Discover results - fully manual, no schedule.
#    At current scale (~10 users) this trains in seconds; just re-run it
#    after any meaningful data change (new follow, new wishlist add, etc.)
python jobs/build_and_train_discover_graph.py

# 3. Whenever you want a new AI-written review to show up in the feed:
python jobs/generate_ai_reviews.py                  # random mapped book
python jobs/generate_ai_reviews.py --book-id 42      # a specific book
```

Nothing here runs on a cron job or scheduler. That's intentional - both
recommendation generation and review posting are manual actions you
trigger, not background jobs.

---

## How `build_and_train_discover_graph.py` works

1. Pulls live data straight from Postgres: `current_reading`,
   `reading_history`, `wishlist`, `followers` (split into mutual
   "friend" pairs vs one-sided "follows" pairs), and `likes`/`comments`
   joined through `reviews` to get back to a `book_id`.
2. Builds a fresh `HeteroData` graph each run - real users get a
   throwaway local index (0..N-1) just for that training pass. The
   book/author/genre side of the graph (content embeddings, `has_genre`,
   `written_by`) is reused as-is from `data/graph/graph.pt`.
3. Trains a small 2-layer GAT with BPR (pairwise ranking) loss - same
   approach that worked for the original Goodreads-bootstrap model, just
   retrained from scratch on real Readify signal instead.
4. For each user's Top-10, walks back through the *real* signal that
   produced it (does the recommended book share a genre/author with
   something in their wishlist? their reading history? something a
   friend has?) and records that as a structured `reason_type` - not
   guessed, not LLM-generated, traced directly from the data.
5. Writes everything to the `recommendations` table, fully replacing
   the previous run's rows.

## How "why this recommendation" gets answered

```
Python: reason_type = "wishlist_match" / "friend_activity" / "reading_history_match" / ...
              |
              v
Node (discoverController.js): REASON_TEXT[reason_type] -> human sentence
   e.g. "Matches books on your wishlist"
              |
              v
React (DiscoverPage.tsx): shown directly under each recommended book
```

No LLM call anywhere in this chain - every reason is templated from a
real, checkable fact.

**Known honest gap:** a user with zero interactions of any kind (and no
friends who have any either) falls back to `reason_type = "similar_readers"` - pure embedding similarity with nothing structural
to point to. At low user counts this can affect a meaningful share of
users. A proper onboarding-based cold-start fallback (using
`user_onboarding.genres` / `favorite_authors` / `books_read`) is the
natural next addition if that turns out to be common - not yet wired
back in after the last redesign.

---

## Design history (why it looks like this, briefly)

- **Originally** this repo trained on a 3,780-user Goodreads bootstrap
  dataset and ran on a scheduled batch job (`Task Scheduler`, every 3
  days), writing precomputed recommendations for a static
  `ai_user_index_map`. That entire approach was replaced once the real
  backend turned out to already have a live cosine-similarity system for
  Feed/Trending/Connections, and the real user count (~10) made
  "retrain fresh every time, manually" both simpler and cheap enough to
  actually do.
- **Loss function:** plain MSE-on-rating regression gave Recall@10 =
  0.0000 - it only taught the model to predict an average rating, never
  to *rank*. Fixed by switching to BPR pairwise loss.
- **Personalization:** user embeddings weren't differentiating between
  users at all until learnable per-user/per-book ID embeddings were
  added (raw behavioral features alone weren't enough signal).
- **Epoch count:** on the old 3,780-user bootstrap graph, more epochs
  past ~15-20 actively hurt held-out Recall (overfitting). On the
  current tiny live graph (~10 users), that tradeoff is different -
  there's far less to memorize, so a longer default (60 epochs) is used
  without the same risk. Worth re-checking as the real user count grows.

---

## Optional

- **`training/gemini_key_rotation.py`**
  - a multi-key fallback wrapper for `generate_ai_reviews.py`, useful if
    you start hitting Gemini's free-tier rate limit and have multiple keys
    to rotate through. Not required at current review-posting volume.
- **Cold-start fallback** for zero-interaction users (see gap above).
- **Scaling past a few hundred users:** the "retrain fresh from scratch
  every manual run" approach is only viable because the graph is tiny.
  Revisit this (incremental training, or back to a scheduled batch job)
  once user count grows meaningfully.
