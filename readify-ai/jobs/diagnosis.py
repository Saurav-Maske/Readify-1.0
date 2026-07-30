"""
Read-only diagnostic: checks why Discover recommendations might be falling
back to reason_type = "similar_readers" more than expected.

Checks three separate, independent possible causes:
  1. Coverage - how many of your live `books` rows are even mapped into the
     graph via ai_book_index_map? Unmapped books can never get a structural
     match (they can still be recommended off embeddings, but only ever as
     'similar_readers').
  2. Graph richness - for books that ARE mapped, does graph.pt actually carry
     has_genre/written_by edges for them? These edges come from graph.pt's
     own bootstrap dataset, NOT from your live books.genre/books.author text
     columns - the two can disagree even for a well-mapped book.
  3. Live signal volume - how many current_reading/reading_history/wishlist/
     likes/comments rows your real users actually have. If these are near-
     empty, 'similar_readers' is the CORRECT fallback, not a bug.

Makes no writes anywhere - safe to run any time.

Usage:
    python jobs/diagnose_reason_coverage.py
"""
from dotenv import load_dotenv
load_dotenv()

import sys, os
import torch

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from db_utils import get_connection, get_book_index_map


def main():
    conn = get_connection()
    book_index_to_id = get_book_index_map()
    mapped_books = len(book_index_to_id)

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM books")
        total_books = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM books WHERE source = 'catalog'")
        catalog_books = cur.fetchone()[0]

    print("=== 1. Coverage: live books table vs. ai_book_index_map ===")
    print(f"Total books in DB:            {total_books}")
    print(f"  of which catalog:           {catalog_books}")
    if total_books:
        print(f"Mapped to a graph book_index: {mapped_books} "
              f"({mapped_books / total_books:.1%} of all books)")
    print("Books with source='user_submitted', or catalog books that failed "
          "sync_book_ids.py's title match, are NOT in this map - they can "
          "still be recommended (via embeddings) but never get a structural "
          "reason_type.\n")

    print("=== 2. Graph richness: has_genre / written_by edges in graph.pt ===")
    base = torch.load("data/graph/graph.pt", weights_only=False)
    genre_edges = base['book', 'has_genre', 'genre'].edge_index
    author_edges = base['book', 'written_by', 'author'].edge_index
    books_with_genre_edge = set(genre_edges[0].tolist())
    books_with_author_edge = set(author_edges[0].tolist())

    mapped_indices = set(book_index_to_id.keys())
    has_genre = mapped_indices & books_with_genre_edge
    has_author = mapped_indices & books_with_author_edge
    if mapped_books:
        print(f"Mapped books with >=1 genre edge:  {len(has_genre)} / {mapped_books} "
              f"({len(has_genre) / mapped_books:.1%})")
        print(f"Mapped books with an author edge:  {len(has_author)} / {mapped_books} "
              f"({len(has_author) / mapped_books:.1%})")
    print("These edges come from graph.pt's own bootstrap dataset, NOT your "
          "live books.genre/books.author text columns - low numbers here mean "
          "genre/author matching is structurally limited regardless of what's "
          "in your live DB.\n")

    print("=== 3. Live interaction volume (per real user) ===")
    with conn.cursor() as cur:
        for label, query in [
            ("current_reading", "SELECT user_id, COUNT(*) FROM current_reading WHERE book_id IS NOT NULL GROUP BY user_id"),
            ("reading_history", "SELECT user_id, COUNT(*) FROM reading_history WHERE book_id IS NOT NULL GROUP BY user_id"),
            ("wishlist", "SELECT user_id, COUNT(*) FROM wishlist GROUP BY user_id"),
            ("likes (on reviews)", """SELECT l.user_id, COUNT(*) FROM likes l
                                       JOIN reviews r ON r.review_id = l.review_id
                                       WHERE l.review_id IS NOT NULL GROUP BY l.user_id"""),
            ("comments (on reviews)", """SELECT c.user_id, COUNT(*) FROM comments c
                                          JOIN reviews r ON r.review_id = c.review_id
                                          WHERE c.review_id IS NOT NULL GROUP BY c.user_id"""),
        ]:
            cur.execute(query)
            rows = cur.fetchall()
            total = sum(c for _, c in rows)
            users_with_any = len(rows)
            print(f"{label:22s} total rows: {total:4d}   users with >=1: {users_with_any}")

    conn.close()
    print("\nRule of thumb: if (1) and (2) both look healthy but (3) is thin, "
          "'similar_readers' is correct/expected - you just don't have enough "
          "live signal yet. If (1) or (2) look thin even though (3) has real "
          "activity, that's the actual bug - your users ARE doing things, the "
          "graph just can't see the genre/author overlap for the books involved.\n")

    print("=== 4. Genre taxonomy granularity ===")
    num_genre_nodes = base['genre'].num_nodes
    avg_genres_per_book = genre_edges.size(1) / mapped_books if mapped_books else 0
    print(f"Distinct genre nodes in graph.pt: {num_genre_nodes}")
    print(f"Avg genre tags per mapped book:    {avg_genres_per_book:.2f}")
    print("If num_genre_nodes is in the hundreds/thousands, these are almost "
          "certainly raw Goodreads shelf tags (e.g. 'epic-fantasy' vs "
          "'fantasy-adventure' as DIFFERENT nodes), not a small curated genre "
          "list - matching requires the exact same node ID, so two books a "
          "human would call 'the same genre' can still register as zero "
          "overlap. This is a plausible explanation for near-constant "
          "'similar_readers' even with (1)/(2)/(3) all looking healthy: the "
          "match test is stricter than it looks, not broken.")


if __name__ == "__main__":
    main()