"""
Manual script: rebuild the graph from LIVE Readify data (not the Goodreads
bootstrap), train a fresh GAT, and write ranked recommendations + structured
reasons into the recommendations table for the Discover page to read.

Run this by hand whenever you want fresh Discover results - there is no
scheduled job. At 10 users this trains in seconds, so re-running after any
meaningful data change (new follows, new wishlist adds, etc.) is cheap.

    python jobs/build_and_train_discover_graph.py
"""
from dotenv import load_dotenv
load_dotenv()

import sys, os
import json
import re
import time
import torch
import numpy as np
import torch_geometric.transforms as T
from torch_geometric.data import HeteroData
from torch_geometric.nn import HeteroConv, GATConv
import torch.nn as nn

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from db_utils import get_connection, get_book_index_map
from gemini_key_rotation import GeminiKeyRotator

EPOCHS = 60          # tiny graph (10 users) - safe to train longer than the
                      # 15-epoch Goodreads sweet spot without overfitting risk
                      # the same way, since there's far less to memorize
HIDDEN_DIM = 32
OUT_DIM = 32
ID_EMB_DIM = 16
TOP_K = 30

# reason_text is optional polish on top of the structured reason_type/reason_data
# (which stay fully deterministic - see the matching loop in main() below). If no
# Gemini keys are configured, we just skip it: rows still get reason_type/reason_data,
# and Node's REASON_TEXT templates keep working exactly as before.
try:
    _reason_text_rotator = GeminiKeyRotator()
except RuntimeError as e:
    print(f"Gemini not configured ({e}) - recommendations will be written "
          f"without reason_text; templated reason_type fallback still applies.")
    _reason_text_rotator = None

REASON_CATEGORY_LABEL = {
    "currently_reading_match": "something they're currently reading",
    "reading_history_match": "something in their reading history",
    "wishlist_match": "something on their wishlist",
    "social_engagement": "a review they recently liked or commented on",
}


def describe_signal(reason_type, reason_data, titles_by_book_id, usernames_by_id):
    """Turns a structured reason_type/reason_data pair into a plain-English
    description of the underlying signal, for Gemini's prompt - not shown to
    users directly."""
    if reason_type == "friend_activity":
        friend_username = usernames_by_id.get(reason_data.get("friend_user_id"))
        if friend_username:
            return f"their friend {friend_username} has this book in their library"
        return "a friend of theirs has this book in their library"
    if reason_type == "similar_readers":
        return "no specific overlap found - pure embedding similarity to their overall taste"

    category = REASON_CATEGORY_LABEL.get(reason_type, "their activity")
    match_kind = reason_data.get("match", "overlap")
    evidence_title = titles_by_book_id.get(reason_data.get("evidence_book_id"))
    if evidence_title:
        return f'shares {match_kind} with "{evidence_title}", which is {category}'
    return f"shares {match_kind} with {category}"


def generate_reason_texts_for_user(rows_for_user, titles_by_book_id, usernames_by_id):
    """
    One Gemini call per user (not per recommendation) - at TOP_K=30 that's the
    difference between ~10 calls and ~300 calls per run, which matters a lot
    on the free tier. Returns {rank: text}; returns {} on any failure so the
    caller can fall back to reason_text = NULL without aborting the run.
    """
    if _reason_text_rotator is None or not rows_for_user:
        return {}

    lines = []
    for r in rows_for_user:
        book_title = titles_by_book_id.get(r["book_id"], f"book_id {r['book_id']}")
        signal = describe_signal(r["reason_type"], r["reason_data"], titles_by_book_id, usernames_by_id)
        lines.append(f'{r["rank"]}. "{book_title}" - signal: {signal}')

    prompt = (
        "You are writing short 'why we recommended this' captions for a book app's "
        "Discover page. For each numbered book below you're given the internal signal "
        "that produced the recommendation. Write ONE warm, natural sentence per book "
        "(max ~18 words) explaining it in plain language a reader would enjoy - "
        "reference their reading history, wishlist, a friend, or their recent likes/"
        "comments on reviews when that's the signal given. If a friend's username is "
        "given in the signal, use that exact username (not a made-up name). Don't "
        "invent facts beyond what's given. If the signal is pure similarity with no "
        "overlap, write a short generic-but-pleasant line about matching their taste.\n\n"
        + "\n".join(lines)
        + '\n\nRespond with ONLY a JSON array, no markdown fences, no preamble, like: '
          '[{"rank": 1, "text": "..."}, {"rank": 2, "text": "..."}]'
    )

    try:
        response = _reason_text_rotator.generate_content(prompt)
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)
        return {item["rank"]: item["text"] for item in parsed if "rank" in item and "text" in item}
    except Exception as e:
        print(f"  reason_text generation failed for this user, leaving NULL: {e}")
        return {}

DISCOVER_EDGE_TYPES = [
    ('user', 'current_reading', 'book'), ('book', 'rev_current_reading', 'user'),
    ('user', 'read', 'book'), ('book', 'rev_read', 'user'),
    ('user', 'wishlists', 'book'), ('book', 'rev_wishlists', 'user'),
    ('user', 'friend', 'user'), ('user', 'rev_friend', 'user'),
    ('user', 'follows', 'user'), ('user', 'rev_follows', 'user'),
    ('user', 'liked_review', 'book'), ('book', 'rev_liked_review', 'user'),
    ('user', 'commented_review', 'book'), ('book', 'rev_commented_review', 'user'),
    ('book', 'written_by', 'author'), ('author', 'rev_written_by', 'book'),
    ('book', 'has_genre', 'genre'), ('genre', 'rev_has_genre', 'book'),
]


class DiscoverGAT(nn.Module):
    def __init__(self, num_users, num_books):
        super().__init__()
        self.user_id_emb = nn.Embedding(num_users, ID_EMB_DIM)
        self.book_id_emb = nn.Embedding(num_books, ID_EMB_DIM)
        self.conv1 = HeteroConv({et: GATConv((-1, -1), HIDDEN_DIM, add_self_loops=False) for et in DISCOVER_EDGE_TYPES}, aggr='mean')
        self.conv2 = HeteroConv({et: GATConv((-1, -1), OUT_DIM, add_self_loops=False) for et in DISCOVER_EDGE_TYPES}, aggr='mean')

    def forward(self, x_dict, edge_index_dict):
        x_dict = dict(x_dict)
        device = x_dict['user'].device
        x_dict['user'] = torch.cat([x_dict['user'], self.user_id_emb(torch.arange(x_dict['user'].size(0), device=device))], dim=1)
        x_dict['book'] = torch.cat([x_dict['book'], self.book_id_emb(torch.arange(x_dict['book'].size(0), device=device))], dim=1)
        x_dict = self.conv1(x_dict, edge_index_dict)
        x_dict = {k: v.relu() for k, v in x_dict.items()}
        return self.conv2(x_dict, edge_index_dict)

def sample_negative(uidx, num_books, user_seen):
    seen = user_seen.get(uidx, set())
    while True:
        b = np.random.randint(0, num_books)
        if b not in seen:
            return b
        
def fetch_live_data(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT user_id FROM users WHERE user_id != 0 ORDER BY user_id")
        real_users = [r[0] for r in cur.fetchall()]

        cur.execute("SELECT user_id, book_id FROM current_reading WHERE book_id IS NOT NULL")
        current_reading = cur.fetchall()

        cur.execute("SELECT user_id, book_id FROM reading_history WHERE book_id IS NOT NULL")
        reading_history = cur.fetchall()

        cur.execute("SELECT user_id, book_id FROM wishlist")
        wishlist = cur.fetchall()

        cur.execute("SELECT follower_id, following_id FROM followers")
        follow_pairs = set(cur.fetchall())

        cur.execute("""
            SELECT l.user_id, r.book_id FROM likes l
            JOIN reviews r ON r.review_id = l.review_id
            WHERE l.review_id IS NOT NULL
        """)
        liked_reviews = cur.fetchall()

        cur.execute("""
            SELECT c.user_id, r.book_id FROM comments c
            JOIN reviews r ON r.review_id = c.review_id
            WHERE c.review_id IS NOT NULL
        """)
        commented_reviews = cur.fetchall()

    return real_users, current_reading, reading_history, wishlist, follow_pairs, liked_reviews, commented_reviews


def build_edge_index(pairs, src_map, dst_map):
    src, dst = [], []
    for a, b in pairs:
        if a in src_map and b in dst_map:
            src.append(src_map[a])
            dst.append(dst_map[b])
    if not src:
        return torch.empty((2, 0), dtype=torch.long)
    return torch.tensor([src, dst], dtype=torch.long)


def main():
    conn = get_connection()
    (real_users, current_reading, reading_history, wishlist,
     follow_pairs, liked_reviews, commented_reviews) = fetch_live_data(conn)

    if len(real_users) < 2:
        print("Not enough real users yet to train a meaningful graph. Skipping.")
        return

    user_id_to_index = {uid: i for i, uid in enumerate(real_users)}

    # split follow_pairs into mutual ("friend") vs one-sided ("follows")
    friend_pairs, one_sided_pairs = [], []
    for follower_id, following_id in follow_pairs:
        if (following_id, follower_id) in follow_pairs:
            friend_pairs.append((follower_id, following_id))
        else:
            one_sided_pairs.append((follower_id, following_id))

    # --- base graph: reuse the existing book/author/genre structure as-is ---
    base = torch.load("data/graph/graph.pt", weights_only=False)
    book_index_to_id = get_book_index_map()  # {book_index: book_id}
    book_id_to_index = {v: k for k, v in book_index_to_id.items()}

    data = HeteroData()
    data['book'].x = base['book'].x
    data['author'].x = base['author'].x
    data['genre'].x = base['genre'].x
    data['book', 'written_by', 'author'].edge_index = base['book', 'written_by', 'author'].edge_index
    data['book', 'has_genre', 'genre'].edge_index = base['book', 'has_genre', 'genre'].edge_index

    num_books = data['book'].num_nodes
    num_users = len(real_users)
    data['user'].x = torch.zeros((num_users, 1))  # personalization comes from ID embeddings, not raw features

    data['user', 'current_reading', 'book'].edge_index = build_edge_index(current_reading, user_id_to_index, book_id_to_index)
    data['user', 'read', 'book'].edge_index = build_edge_index(reading_history, user_id_to_index, book_id_to_index)
    data['user', 'wishlists', 'book'].edge_index = build_edge_index(wishlist, user_id_to_index, book_id_to_index)
    data['user', 'friend', 'user'].edge_index = build_edge_index(friend_pairs, user_id_to_index, user_id_to_index)
    data['user', 'follows', 'user'].edge_index = build_edge_index(one_sided_pairs, user_id_to_index, user_id_to_index)
    data['user', 'liked_review', 'book'].edge_index = build_edge_index(liked_reviews, user_id_to_index, book_id_to_index)
    data['user', 'commented_review', 'book'].edge_index = build_edge_index(commented_reviews, user_id_to_index, book_id_to_index)

    data = T.ToUndirected()(data)
    data['genre'].x = torch.log1p(data['genre'].x.clamp(min=0))

    # --- positive pairs for BPR supervision: union of all real signals ---
    positive_pairs = set()
    for pairs in (current_reading, reading_history, wishlist, liked_reviews, commented_reviews):
        for uid, bid in pairs:
            if uid in user_id_to_index and bid in book_id_to_index:
                positive_pairs.add((user_id_to_index[uid], book_id_to_index[bid]))

    if not positive_pairs:
        print("No positive interactions yet (no current_reading/history/wishlist/likes/comments). "
              "Nothing to train on - Discover will fall back to onboarding-based cold start for everyone.")
        conn.close()
        return

    positive_pairs = list(positive_pairs)
    user_seen = {}
    for u, b in positive_pairs:
        user_seen.setdefault(u, set()).add(b)

    model = DiscoverGAT(num_users=num_users, num_books=num_books)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    user_idx = torch.tensor([p[0] for p in positive_pairs])
    pos_book_idx = torch.tensor([p[1] for p in positive_pairs])

    for epoch in range(EPOCHS):
        model.train()
        optimizer.zero_grad()
        out = model(data.x_dict, data.edge_index_dict)
        user_emb, book_emb = out['user'], out['book']

        neg_book_idx = torch.tensor([
            sample_negative(u.item(), num_books, user_seen)
            for u in user_idx
        ])
        pos_scores = (user_emb[user_idx] * book_emb[pos_book_idx]).sum(-1)
        neg_scores = (user_emb[user_idx] * book_emb[neg_book_idx]).sum(-1)
        loss = -torch.log(torch.sigmoid(pos_scores - neg_scores) + 1e-8).mean()
        loss.backward()
        optimizer.step()

        if epoch % 10 == 0 or epoch == EPOCHS - 1:
            acc = (pos_scores > neg_scores).float().mean().item()
            print(f"Epoch {epoch+1} | Loss: {loss.item():.4f} | Pairwise acc: {acc:.4f}")

    # --- generate + write recommendations with structured reasons ---
    model.eval()
    with torch.no_grad():
        out = model(data.x_dict, data.edge_index_dict)
        user_emb = torch.nn.functional.normalize(out['user'], dim=1)
        book_emb = torch.nn.functional.normalize(out['book'], dim=1)

    with conn.cursor() as cur:
        cur.execute("SELECT book_id, title FROM books")
        titles_by_book_id = dict(cur.fetchall())
        cur.execute("SELECT user_id, username FROM users")
        usernames_by_id = dict(cur.fetchall())
        cur.execute("SELECT book_id, genre, author FROM books")
        genre_rows = cur.fetchall()

    index_to_user_id = {v: k for k, v in user_id_to_index.items()}

    # Genre/author matching runs off the LIVE books.genre/books.author text
    # columns, not graph.pt's own genre/author nodes. graph.pt's genre nodes
    # turned out to be ~969 raw Goodreads shelf tags at ~9.35/book - granular
    # enough that two books a person would call "the same genre" often don't
    # share a tag ID, which made every match near-impossible even with plenty
    # of real signal. books.genre is a single flat field you control, so an
    # overlap here means what it looks like it means.
    def normalize_tags(raw_text):
        if not raw_text:
            return set()
        return {p.strip().lower() for p in re.split(r"[,;/|]", raw_text) if p.strip()}

    genres_by_book_id = {}
    authors_by_book_id = {}
    for bid, genre_text, author_text in genre_rows:
        genres_by_book_id[bid] = normalize_tags(genre_text)
        authors_by_book_id[bid] = normalize_tags(author_text)

    def genres_of(bidx):
        return genres_by_book_id.get(book_index_to_id.get(bidx), set())

    def author_of(bidx):
        return authors_by_book_id.get(book_index_to_id.get(bidx), set())

    def signal_set(pairs_by_user, uidx):
        return {book_id_to_index[bid] for uid, bid in pairs_by_user
                if user_id_to_index.get(uid) == uidx and bid in book_id_to_index}

    all_rows = []
    for uid, uidx in user_id_to_index.items():
        scores = user_emb[uidx] @ book_emb.T
        seen = user_seen.get(uidx, set())
        if seen:
            scores[list(seen)] = -1e9
        top_scores, top_idx = torch.topk(scores, TOP_K)

        cr_books = signal_set(current_reading, uidx)
        rh_books = signal_set(reading_history, uidx)
        wl_books = signal_set(wishlist, uidx)
        social_books = signal_set(liked_reviews, uidx) | signal_set(commented_reviews, uidx)

        friend_indices = {user_id_to_index[b] for a, b in friend_pairs if a == uid and b in user_id_to_index}
        friend_positive_books = set()
        for fidx in friend_indices:
            friend_positive_books |= user_seen.get(fidx, set())

        def category_genres_authors(book_idxs):
            g, a = set(), set()
            for b in book_idxs:
                g |= genres_of(b)
                a |= author_of(b)
            return g, a

        user_rows = []
        for rank, (bidx, score) in enumerate(zip(top_idx.tolist(), top_scores.tolist()), start=1):
            if bidx not in book_index_to_id:
                continue
            book_id = book_index_to_id[bidx]
            rec_genres = genres_of(bidx)
            rec_authors = author_of(bidx)

            reason_type = "similar_readers"  # fallback: pure embedding similarity, no clear structural overlap
            reason_data = {}

            for label, book_set in [
                ("currently_reading_match", cr_books),
                ("reading_history_match", rh_books),
                ("wishlist_match", wl_books),
                ("social_engagement", social_books),
            ]:
                g, a = category_genres_authors(book_set)
                if rec_authors & a:
                    evidence_bidx = next(b for b in book_set if author_of(b) & rec_authors)
                    reason_type, reason_data = label, {
                        "match": "author",
                        "evidence_book_id": book_index_to_id.get(evidence_bidx),
                    }
                    break
                if rec_genres & g:
                    evidence_bidx = next(b for b in book_set if rec_genres & genres_of(b))
                    reason_type, reason_data = label, {
                        "match": "genre",
                        "evidence_book_id": book_index_to_id.get(evidence_bidx),
                    }
                    break

            if reason_type == "similar_readers" and bidx in friend_positive_books:
                friend_idx = next(fidx for fidx in friend_indices if bidx in user_seen.get(fidx, set()))
                reason_type, reason_data = "friend_activity", {"friend_user_id": index_to_user_id[friend_idx]}

            user_rows.append({
                "book_id": book_id, "rank": rank, "score": score,
                "reason_type": reason_type, "reason_data": reason_data,
            })

        # one Gemini call for this user's whole Top-30, not one per row
        reason_texts_by_rank = generate_reason_texts_for_user(user_rows, titles_by_book_id, usernames_by_id)
        if _reason_text_rotator is not None:
            time.sleep(2)  # ~10 users = ~20s added, cheap insurance against bursting the per-project RPM quota
        for r in user_rows:
            all_rows.append((
                uid, r["book_id"], r["rank"], r["score"], r["reason_type"],
                json.dumps(r["reason_data"]), reason_texts_by_rank.get(r["rank"]),
            ))

    with conn.cursor() as cur:
        cur.execute("DELETE FROM recommendations")  # full refresh each manual run
        from psycopg2.extras import execute_values
        execute_values(cur,
            """INSERT INTO recommendations
               (user_id, book_id, rank, score, reason_type, reason_data, reason_text)
               VALUES %s""",
            all_rows)
    conn.commit()
    conn.close()

    print(f"\nWrote {len(all_rows)} Discover recommendation rows for {len(user_id_to_index)} users.")


if __name__ == "__main__":
    main()