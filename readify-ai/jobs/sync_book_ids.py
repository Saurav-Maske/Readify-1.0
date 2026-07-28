"""
Builds/refreshes the mapping between the model's internal book_index
(0..41494, from graph.pt) and Readify's real books.book_id.

Run this:
  - once, right after setting up a fresh Readify database
  - again any time new books are bulk-imported into the catalog

Current matching strategy: normalized title match (both the model's
dataset and Readify's catalog trace back to the same 40K source, so
this should catch the large majority). Titles that don't match are
reported as unmatched - if that list is large, switch to ISBN-based
matching instead (Stage 1's readme notes ISBN was preserved during
cleaning, so it should be available as a fallback join key).
"""
from dotenv import load_dotenv

load_dotenv()
import sys
import os
import re
import csv
from datetime import datetime
from collections import defaultdict

from rapidfuzz import fuzz, process

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "training"))

from lookup_utils import load_book_index_to_title
try:
    from lookup_utils import load_book_index_to_author
except ImportError:
    # Not present in lookup_utils.py as of this writing - book_lookup.pkl is
    # only {goodreads_slug: book_index}, with no author field to derive from.
    # source_author will be blank in the log until this is wired up to a
    # real data source. See the warning printed in main().
    load_book_index_to_author = None
from db_utils import get_connection, upsert_book_index_map

# Below this similarity ratio (0-100 scale), a fuzzy candidate is not
# auto-accepted - it goes to the manual-review list instead of being
# silently mapped.
FUZZY_MATCH_THRESHOLD = 93

# Candidates scoring at or above this (but below FUZZY_MATCH_THRESHOLD, or
# ambiguous even above it) aren't auto-accepted either, but they DO have a
# plausible best guess - unlike the rest of needs_review, which may have no
# candidate at all. These get their own low_confidence bucket so a human
# reviewer can look at "probably this one, please confirm" separately from
# "no real idea."
LOW_CONFIDENCE_THRESHOLD = 80

# Where the per-run audit log (CSV) gets written. One row per book_index,
# tagged with which pass matched it (or "needs_review" if none did), so
# you can filter/sort/diff runs instead of scrolling terminal output.
LOG_DIR = os.path.join(os.path.dirname(__file__), "sync_logs")


ROMAN_NUMERAL_RE = re.compile(r"\b(?:[ivxlcdm]+)\b")
DIGIT_RE = re.compile(r"\d+")


def extract_numbers(title):
    """
    Pulls out anything that looks like a volume/book number - plain
    digits ('2', '80') or roman numerals ('ii', 'iii') - so we can
    check whether two titles disagree about which number they mean.
    e.g. "Chicken Soup...III" vs "...Teenage Soul II" -> {'iii'} vs {'ii'}:
    different numbers, so this should NOT be treated as the same book,
    no matter how high the character-similarity score is.
    """
    lowered = title.lower()
    digits = set(DIGIT_RE.findall(lowered))
    romans = set(m for m in ROMAN_NUMERAL_RE.findall(lowered) if m not in ("i", "a"))
    return digits | romans


def numbers_conflict(title_a, title_b):
    """True if both titles contain a number/numeral and they disagree."""
    nums_a = extract_numbers(title_a)
    nums_b = extract_numbers(title_b)
    if not nums_a or not nums_b:
        return False  # only one side has a number - not a conflict, could be a subtitle
    return nums_a != nums_b


STOPWORDS = {"a", "an", "the", "of", "and", "or", "in", "on", "at", "to", "for"}


def has_word_substitution(title_a, title_b):
    """
    Same source dataset on both sides means a genuinely-correct match
    should be recoverable via formatting differences alone (missing
    subtitle, added edition tag, punctuation, dropped/added number) -
    never by one specific word turning into a different word. If word
    counts match but exactly one non-stopword differs, that's the
    signature of two different, coincidentally-similar books in a
    40K-title catalog (e.g. "Mad In America" vs "Made in America",
    "The Ice Man" vs "The Dice Man") - not a slug artifact. Reject it
    outright rather than sending it to manual review, since with the
    dataset provenance we have, there should be no legitimate reason
    for this shape of mismatch to be a true match.
    """
    words_a = re.findall(r"[a-z0-9']+", title_a.lower())
    words_b = re.findall(r"[a-z0-9']+", title_b.lower())
    if len(words_a) != len(words_b):
        return False  # different word count -> could be a missing subtitle, handled elsewhere
    diffs = [
        (wa, wb)
        for wa, wb in zip(words_a, words_b)
        if wa != wb and wa not in STOPWORDS and wb not in STOPWORDS
    ]
    # allow trivial singular/plural ("consolation"/"consolations") through,
    # only reject when the words share no common root at all
    real_diffs = [
        (wa, wb) for wa, wb in diffs
        if not (wa.rstrip("s") == wb.rstrip("s"))
    ]
    return len(real_diffs) >= 1


def normalize_key(title):
    """
    Strips every non-alphanumeric character (not just whitespace), so
    punctuation differences between the two title sources stop mattering:
      "Catch-22"                  -> "catch22"
      "Catch 22"                  -> "catch22"
      "Moby-Dick; or, The Whale"  -> "mobydickortewhale"
      "Moby Dick Or The Whale"    -> "mobydickorthewhale"
      "The Hitchhiker's Guide"    -> "thehitchhikersguide"
      "Hitchhiker S Guide"        -> "hitchhikersguide"   (un-fixed slug form)
    This subsumes the old apostrophe-only fix and also resolves the
    hyphen ambiguity (slug hyphens can mean a real word-separating space
    OR real punctuation - stripping punctuation entirely sidesteps the
    ambiguity instead of trying to guess which one it was).
    """
    return re.sub(r"[^a-z0-9]", "", title.lower())


# A source title shorter than this (normalized, no spaces) is too generic
# to trust as a prefix match on its own - e.g. "War" is a prefix of dozens
# of unrelated titles ("Warcraft", "Warhorse", "Wartime Lies"...).
MIN_PREFIX_LEN = 6


def prefix_fallback(still_unmatched, readify_lookup, readify_titles_by_id):
    """
    Catches the case where the model's title is simply missing a subtitle
    that Readify's catalog title includes - e.g. "Frankenstein" (source)
    vs "Frankenstein: The 1818 Text" (catalog), or "Flow Down Like Silver"
    vs "Flow Down Like Silver: Hypatia of Alexandria". This is a very
    different, safer signal than fuzz.ratio scoring: fuzz.ratio penalizes
    the length difference heavily and rejects these as low-confidence,
    even though "is my title an exact prefix of theirs" is unambiguous
    when it holds. Requires the source title to be reasonably long
    (MIN_PREFIX_LEN) and for the prefix to be unique within its block, to
    avoid short generic titles matching unrelated books that happen to
    start with the same word.
    """
    blocks = defaultdict(list)
    for norm_title, bid in readify_lookup.items():
        blocks[norm_title[:3]].append((norm_title, bid))

    recovered = []
    still_needs_review = []
    for book_index, title, prior_note, prior_score in still_unmatched:
        norm = normalize_key(title)
        if len(norm) < MIN_PREFIX_LEN:
            still_needs_review.append((book_index, title, prior_note, prior_score))
            continue

        candidates = blocks.get(norm[:3], [])
        prefix_matches = [(n, bid) for n, bid in candidates if n.startswith(norm) and n != norm]

        if len(prefix_matches) == 1:
            matched_norm, bid = prefix_matches[0]
            matched_title = readify_titles_by_id.get(bid, matched_norm)
            recovered.append((book_index, bid, title, matched_title))
        elif len(prefix_matches) > 1:
            still_needs_review.append(
                (book_index, title, f"AMBIGUOUS PREFIX: {len(prefix_matches)} catalog titles start with this", prior_score)
            )
        else:
            still_needs_review.append((book_index, title, prior_note, prior_score))

    return recovered, still_needs_review


def fuzzy_fallback(unmatched, readify_lookup, readify_titles_by_id):
    """
    Tries to recover cases where the slug lost a character outright
    (e.g. accented letters dropped during slug generation: 'Les
    Mis Rables' vs 'Les Misérables'). Blocks candidates by the first
    3 normalized characters to keep comparisons tractable (rapidfuzz's
    C implementation makes even large blocks - e.g. "the..." titles,
    which dominate real book catalogs - fast).

    Three outcomes per title:
      - recovered: score >= FUZZY_MATCH_THRESHOLD and unambiguous (no
        second candidate within 3 points of the top score). Auto-accepted.
      - low_confidence: has a real best-guess candidate, but the score
        didn't clear the bar (or was ambiguous) - NOT auto-accepted, but
        distinct from needs_review because there IS something specific
        for a human to confirm or reject.
      - needs_review: no usable candidate at all (empty block), or the
        candidate was rejected outright by numbers_conflict/
        has_word_substitution - both bar a match regardless of how high
        the raw fuzz.ratio score was.
    """
    blocks = defaultdict(list)
    for norm_title, bid in readify_lookup.items():
        blocks[norm_title[:3]].append((norm_title, bid))

    recovered = []
    low_confidence = []
    needs_review = []
    total = len(unmatched)
    for i, (book_index, title) in enumerate(unmatched, 1):
        if i % 500 == 0 or i == total:
            print(f"  fuzzy pass: {i}/{total}", file=sys.stderr)

        norm = normalize_key(title)
        candidates = blocks.get(norm[:3], [])
        if not candidates:
            needs_review.append((book_index, title, None, 0.0))
            continue

        cand_norms = [c[0] for c in candidates]
        results = process.extract(norm, cand_norms, scorer=fuzz.ratio, limit=2)
        # results: list of (matched_string, score, index_into_cand_norms)
        top_str, top_score, top_idx = results[0]
        runner_up_score = results[1][1] if len(results) > 1 else 0.0
        is_unambiguous = (top_score - runner_up_score) > 3
        top_bid = candidates[top_idx][1]
        matched_title = readify_titles_by_id.get(top_bid, top_str)

        if numbers_conflict(title, matched_title):
            # e.g. "Chicken Soup...III" vs "...II", "Neutronium Alchemist 1"
            # vs "...2" - looks similar but is a different volume/book.
            # Barred outright, regardless of score - goes to needs_review,
            # not low_confidence, since this isn't "unsure," it's "no."
            needs_review.append((book_index, title, top_str, top_score))
        elif has_word_substitution(title, matched_title):
            # e.g. "Mad In America" vs "Made in America", "The Ice Man" vs
            # "The Dice Man" - same shape, one word swapped for a different
            # word. Given both sides trace to the same source dataset, this
            # is almost certainly two different, coincidentally-similar
            # books rather than a formatting variant of the same one.
            needs_review.append((book_index, title, top_str, top_score))
        elif top_score >= FUZZY_MATCH_THRESHOLD and is_unambiguous:
            recovered.append((book_index, top_bid, title, top_score))
        elif top_score >= LOW_CONFIDENCE_THRESHOLD:
            low_confidence.append((book_index, top_bid, title, top_score))
        else:
            needs_review.append((book_index, title, top_str, top_score))

    # Guard against multiple different book_index entries all claiming the
    # same catalog book_id (e.g. "Warriors" matching the same id five
    # times, or two different volumes collapsing onto one book). One
    # book_id being claimed twice usually means the fuzzy match is too
    # loose for that title, not that two entries really are duplicates -
    # so pull all of them back out into needs_review rather than guessing
    # which one (if any) is correct. Only applied to the auto-accept list;
    # low_confidence entries are all headed to manual review regardless,
    # so a reviewer will naturally catch duplicate claims there.
    claim_counts = defaultdict(list)
    for entry in recovered:
        _, bid, _, _ = entry
        claim_counts[bid].append(entry)

    deduped_recovered = []
    for bid, entries in claim_counts.items():
        if len(entries) == 1:
            deduped_recovered.append(entries[0])
        else:
            for book_index, bid, title, score in entries:
                matched_title = readify_titles_by_id.get(bid, "<unknown>")
                needs_review.append(
                    (book_index, title, f"CONFLICT: {len(entries)} entries all matched '{matched_title}' (book_id={bid})", score)
                )

    return deduped_recovered, low_confidence, needs_review


def main():
    book_titles = load_book_index_to_title()  # {book_index: readable_title}
    if load_book_index_to_author:
        book_authors = load_book_index_to_author()  # {book_index: author}
    else:
        book_authors = {}
        print(
            "WARNING: lookup_utils.load_book_index_to_author() not found - "
            "source_author will be blank in the log until this is added.",
            file=sys.stderr,
        )

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT book_id, title, author FROM books")
        readify_books = cur.fetchall()
    conn.close()
    # NOTE: assumes books has an `author` column. Adjust the SELECT above
    # if the real column name differs.

    readify_lookup = {}
    readify_titles_by_id = {}
    readify_authors_by_id = {}
    for bid, t, author in readify_books:
        readify_lookup[normalize_key(t)] = bid
        readify_titles_by_id[bid] = t
        readify_authors_by_id[bid] = author

    rows = []
    exact_matches = []  # (book_index, bid, source_title, matched_title) - for the log
    unmatched = []
    for book_index, title in book_titles.items():
        match = readify_lookup.get(normalize_key(title))
        if match:
            rows.append((book_index, match))
            exact_matches.append((book_index, match, title, readify_titles_by_id.get(match, "")))
        else:
            unmatched.append((book_index, title))

    exact_matched_count = len(rows)
    upsert_book_index_map(rows)  # exact matches only - these are unambiguous, safe to write now

    fuzzy_recovered, low_confidence, needs_review = fuzzy_fallback(unmatched, readify_lookup, readify_titles_by_id)
    prefix_recovered, needs_review = prefix_fallback(needs_review, readify_lookup, readify_titles_by_id)

    def author_cols(book_index, bid):
        """(source_author, matched_author) for a log row, blank if unknown."""
        src_author = book_authors.get(book_index, "")
        matched_author = readify_authors_by_id.get(bid, "") if bid is not None else ""
        return src_author, matched_author

    # ---- write the full audit log to CSV instead of dumping to the terminal ----
    os.makedirs(LOG_DIR, exist_ok=True)
    log_path = os.path.join(LOG_DIR, f"book_id_sync_{datetime.now():%Y%m%d_%H%M%S}.csv")
    with open(log_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "book_index", "match_type", "source_title", "source_author",
            "book_id", "matched_title", "matched_author", "score", "note",
        ])

        for book_index, bid, title, matched_title in exact_matches:
            src_author, matched_author = author_cols(book_index, bid)
            writer.writerow([book_index, "exact", title, src_author, bid, matched_title, matched_author, "", ""])

        for book_index, bid, title, score in fuzzy_recovered:
            matched_title = readify_titles_by_id.get(bid, "<unknown>")
            src_author, matched_author = author_cols(book_index, bid)
            writer.writerow([book_index, "fuzzy", title, src_author, bid, matched_title, matched_author, f"{score:.1f}", ""])

        for book_index, bid, title, matched_title in prefix_recovered:
            src_author, matched_author = author_cols(book_index, bid)
            writer.writerow([book_index, "prefix", title, src_author, bid, matched_title, matched_author, "", ""])

        # Mandatory human review: has a plausible best-guess candidate, but
        # didn't clear the auto-accept bar. NOT written to the DB by this
        # script under any circumstances - a person has to confirm each one.
        for book_index, bid, title, score in low_confidence:
            matched_title = readify_titles_by_id.get(bid, "<unknown>")
            src_author, matched_author = author_cols(book_index, bid)
            note = "MANDATORY REVIEW - confirm before writing"
            if src_author and matched_author and normalize_key(src_author) != normalize_key(matched_author):
                note += " - AUTHOR MISMATCH"
            writer.writerow([book_index, "low_confidence_fuzzy", title, src_author, bid, matched_title, matched_author, f"{score:.1f}", note])

        for book_index, title, best_guess_norm, score in needs_review:
            src_author, _ = author_cols(book_index, None)
            writer.writerow([book_index, "needs_review", title, src_author, "", best_guess_norm or "", "", f"{score:.1f}", ""])

    # ---- terminal only gets the counts, so nothing scrolls off ----
    total = exact_matched_count + len(fuzzy_recovered) + len(prefix_recovered) + len(low_confidence) + len(needs_review)
    print(f"Mapped {exact_matched_count} books via exact match (written to DB).")
    print(f"{len(fuzzy_recovered)} additional fuzzy candidates found - NOT yet written to the DB.")
    print(f"{len(prefix_recovered)} additional prefix-match candidates found - NOT yet written to the DB.")
    print(f"{len(low_confidence)} low-confidence fuzzy candidates - MANDATORY human review, NOT yet written to the DB.")
    print(f"{len(needs_review)} unmatched / no plausible candidate found.")
    print(f"Total book_index entries accounted for: {total}")
    print(f"\nFull details written to: {log_path}")
    print(
        "\nTo commit fuzzy/prefix/low_confidence_fuzzy matches you've verified, filter the CSV to "
        "the match_type(s) and rows you approve, then call "
        "upsert_book_index_map() with the (book_index, book_id) pairs."
    )


if __name__ == "__main__":
    main()