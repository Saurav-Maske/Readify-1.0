import os
import psycopg2
from psycopg2.extras import execute_values


def get_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=os.environ.get("DB_PORT", 5432),
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )


def replace_recommendations(rows):
    """
    rows: list of (user_id, book_id, rank, score, reason_type, reason_data_json) tuples.
    Fully replaces the recommendations table on each scheduled run.
    """
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("TRUNCATE recommendations;")
        execute_values(
            cur,
            """INSERT INTO recommendations
               (user_id, book_id, rank, score, reason_type, reason_data)
               VALUES %s""",
            rows,
        )
    conn.commit()
    conn.close()


def get_book_index_map():
    """Returns {book_index: book_id} from ai_book_index_map."""
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT book_index, book_id FROM ai_book_index_map")
        result = dict(cur.fetchall())
    conn.close()
    return result


def upsert_book_index_map(rows):
    """rows: list of (book_index, book_id) tuples."""
    conn = get_connection()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO ai_book_index_map (book_index, book_id) VALUES %s
               ON CONFLICT (book_index) DO UPDATE SET book_id = EXCLUDED.book_id""",
            rows,
        )
    conn.commit()
    conn.close()


def get_user_index_map():
    """Returns {user_index: user_id} for Goodreads-bootstrap users mapped to real accounts."""
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT user_index, user_id FROM ai_user_index_map WHERE user_id IS NOT NULL")
        result = dict(cur.fetchall())
    conn.close()
    return result
