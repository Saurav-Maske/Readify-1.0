"""
Applies the fuzzy/prefix/low_confidence_fuzzy rows from a sync_book_ids.py
audit log (CSV) to the DB, once you've reviewed them.

Usage:
  python apply_reviewed_matches.py                  # uses the most recent CSV in sync_logs/
  python apply_reviewed_matches.py path/to/log.csv   # uses a specific CSV

Only rows with match_type in {'fuzzy', 'prefix', 'low_confidence_fuzzy'} and
a non-blank book_id are applied:
  - 'exact' rows were already written to the DB by sync_book_ids.py itself
  - 'needs_review' rows have no book_id, so there's nothing to apply

To reject specific rows before running this: delete them from the CSV, or
change their match_type to anything outside the three above (e.g.
'rejected') and they'll be skipped.

If a book_id is claimed by more than one book_index (i.e. two rows
disagree about which book_index maps to it), ALL rows for that book_id are
skipped and written to a separate skipped_conflicts_*.csv next to the
input log, for manual follow-up - everything else still gets applied.
"""
from dotenv import load_dotenv

load_dotenv()
import csv
import glob
import os
import sys
from collections import defaultdict

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "training"))
from db_utils import upsert_book_index_map

LOG_DIR = os.path.join(os.path.dirname(__file__), "sync_logs")
APPLICABLE_TYPES = {"fuzzy", "prefix", "low_confidence_fuzzy"}


def find_latest_log():
    candidates = sorted(glob.glob(os.path.join(LOG_DIR, "book_id_sync_*.csv")))
    if not candidates:
        raise FileNotFoundError(f"No log CSVs found in {LOG_DIR}")
    return candidates[-1]


def main():
    log_path = sys.argv[1] if len(sys.argv) > 1 else find_latest_log()
    print(f"Reading {log_path}")

    rows_by_book_id = defaultdict(list)
    with open(log_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["match_type"] not in APPLICABLE_TYPES:
                continue
            book_id = row["book_id"].strip()
            if not book_id:
                continue
            rows_by_book_id[int(book_id)].append(row)

    if not rows_by_book_id:
        print("Nothing to apply - no fuzzy/prefix/low_confidence_fuzzy rows with a book_id found.")
        return

    pairs = []
    skipped_rows = []
    for book_id, rows in rows_by_book_id.items():
        if len(rows) == 1:
            pairs.append((int(rows[0]["book_index"]), book_id))
        else:
            skipped_rows.extend(rows)

    if skipped_rows:
        skipped_path = os.path.join(
            os.path.dirname(log_path),
            f"skipped_conflicts_{os.path.basename(log_path).replace('book_id_sync_', '')}",
        )
        with open(skipped_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=skipped_rows[0].keys())
            writer.writeheader()
            writer.writerows(skipped_rows)
        conflicting_book_ids = {row["book_id"] for row in skipped_rows}
        print(
            f"Skipping {len(skipped_rows)} rows across {len(conflicting_book_ids)} conflicting book_id(s) "
            f"(same book_id claimed by more than one book_index) - written to {skipped_path} for follow-up."
        )

    if not pairs:
        print("Nothing left to apply after removing conflicts.")
        return

    print(f"Applying {len(pairs)} (book_index, book_id) pairs to the DB...")
    upsert_book_index_map(pairs)
    print("Done.")


if __name__ == "__main__":
    main()