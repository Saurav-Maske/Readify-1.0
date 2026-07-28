"""
Manual script: posts one AI-written review as readify_ai (user_id = 0).

Usage:
    python jobs/generate_ai_reviews.py                 # picks a random mapped book
    python jobs/generate_ai_reviews.py --book-id 42     # reviews that specific book

No scheduling, no batching by default - run it by hand whenever you want a
new AI review to show up. Uses GeminiKeyRotator so a rate-limited key
silently falls through to the next one; only errors if every key fails.
"""
from dotenv import load_dotenv
load_dotenv()

import sys
import os
import argparse
sys.path.append(os.path.join(os.path.dirname(_file_), "..", "training"))
from db_utils import get_connection
from gemini_key_rotation import GeminiKeyRotator

READIFY_AI_USER_ID = 0
MAX_RETRIES = 3

rotator = GeminiKeyRotator()


def generate_with_retry(prompt, retries=MAX_RETRIES):
    for attempt in range(retries):
        try:
            response = rotator.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"  Error: {e}")
            if attempt < retries - 1:
                print(f"  Retrying (attempt {attempt+2}/{retries})...")
    print("  Failed after retries.")
    return None


def generate_review_and_rating(title, existing_rating):
    prompt = (
        f"Write a short, engaging 3-4 sentence review of '{title}', as if recommending it to a friend. "
        f"Then on a new line write ONLY: RATING: X.X (a number 0.0-5.0 reflecting how positive your review is)."
    )
    text = generate_with_retry(prompt)
    if text and "RATING:" in text:
        try:
            review_part, rating_part = text.rsplit("RATING:", 1)
            rating = float(rating_part.strip())
            return review_part.strip(), min(max(rating, 0), 5)
        except ValueError:
            pass
    return (text, existing_rating or 3.5) if text else (None, existing_rating or 3.5)


def get_book_by_id(conn, book_id):
    with conn.cursor() as cur:
        cur.execute("SELECT book_id, title, rating FROM books WHERE book_id = %s", (book_id,))
        return cur.fetchone()


def get_random_mapped_book(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT b.book_id, b.title, b.rating
            FROM ai_book_index_map m
            JOIN books b ON b.book_id = m.book_id
            ORDER BY RANDOM() LIMIT 1
        """)
        return cur.fetchone()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book-id", type=int, default=None, help="Specific book_id to review. Omit for a random pick.")
    args = parser.parse_args()

    conn = get_connection()

    if args.book_id is not None:
        book = get_book_by_id(conn, args.book_id)
        if book is None:
            print(f"No book found with book_id={args.book_id}")
            conn.close()
            return
    else:
        book = get_random_mapped_book(conn)
        if book is None:
            print("No mapped books found. Run jobs/sync_book_ids.py first.")
            conn.close()
            return

    book_id, title, existing_rating = book
    print(f"Generating review for: {title} (book_id={book_id})")

    review_text, rating = generate_review_and_rating(title, existing_rating)
    if not review_text:
        print("Failed to generate a review. Nothing was posted.")
        conn.close()
        return

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO reviews (user_id, book_id, rating, review)
            VALUES (%s, %s, %s, %s) RETURNING review_id
        """, (READIFY_AI_USER_ID, book_id, rating, review_text))
        review_id = cur.fetchone()[0]
        cur.execute("INSERT INTO ai_reviews (book_id, review_id) VALUES (%s, %s)", (book_id, review_id))
    conn.commit()
    conn.close()

    print(f"\nPosted review (rating {rating}) for '{title}' as user_id=0.")
    print(f"Review: {review_text}")


if __name__ == "__main__":
    main()