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
import torch
import numpy as np
import torch_geometric.transforms as T
from torch_geometric.data import HeteroData
from torch_geometric.nn import HeteroConv, GATConv
import torch.nn as nn

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from db_utils import get_connection, get_book_index_map

EPOCHS = 60          # tiny graph (10 users) - safe to train longer than the
                      # 15-epoch Goodreads sweet spot without overfitting risk
                      # the same way, since there's far less to memorize
HIDDEN_DIM = 32
OUT_DIM = 32
ID_EMB_DIM = 16
TOP_K = 10

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

    book_genre_edges = data['book', 'has_genre', 'genre'].edge_index
    book_author_edges = data['book', 'written_by', 'author'].edge_index

    def genres_of(bidx):
        return set(book_genre_edges[1][book_genre_edges[0] == bidx].tolist())

    def author_of(bidx):
        ids = book_author_edges[1][book_author_edges[0] == bidx].tolist()
        return ids[0] if ids else None

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
                au = author_of(b)
                if au is not None:
                    a.add(au)
            return g, a

        for rank, (bidx, score) in enumerate(zip(top_idx.tolist(), top_scores.tolist()), start=1):
            if bidx not in book_index_to_id:
                continue
            book_id = book_index_to_id[bidx]
            rec_genres = genres_of(bidx)
            rec_author = author_of(bidx)

            reason_type = "similar_readers"  # fallback: pure embedding similarity, no clear structural overlap
            reason_data = {}

            for label, book_set in [
                ("currently_reading_match", cr_books),
                ("reading_history_match", rh_books),
                ("wishlist_match", wl_books),
                ("social_engagement", social_books),
            ]:
                g, a = category_genres_authors(book_set)
                if rec_author is not None and rec_author in a:
                    reason_type, reason_data = label, {"match": "author"}
                    break
                if rec_genres & g:
                    reason_type, reason_data = label, {"match": "genre"}
                    break

            if reason_type == "similar_readers" and bidx in friend_positive_books:
                reason_type, reason_data = "friend_activity", {}

            all_rows.append((uid, book_id, rank, score, reason_type, json.dumps(reason_data)))

    with conn.cursor() as cur:
        cur.execute("DELETE FROM recommendations")  # full refresh each manual run
        from psycopg2.extras import execute_values
        execute_values(cur,
            """INSERT INTO recommendations (user_id, book_id, rank, score, reason_type, reason_data)
               VALUES %s""",
            all_rows)
    conn.commit()
    conn.close()

    print(f"\nWrote {len(all_rows)} Discover recommendation rows for {len(user_id_to_index)} users.")


if __name__ == "__main__":
    main()