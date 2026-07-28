import pickle
import re

BOOK_LOOKUP_PATH = "data/graph/lookup/book_lookup.pkl"


def load_book_index_to_title(path=BOOK_LOOKUP_PATH):
    """
    book_lookup.pkl is stored as {goodreads_slug: book_index}.
    This inverts it and converts slugs into readable titles, e.g.
    '2767052-the-hunger-games' -> 'The Hunger Games'
    """
    with open(path, "rb") as f:
        book_lookup = pickle.load(f)

    index_to_slug = {v: k for k, v in book_lookup.items()}

    def slug_to_title(slug):
        title = re.sub(r'^[\d.]+[-]?', '', slug)
        title = title.replace('_', ' ').replace('-', ' ')
        title = title.strip().title()
        # Goodreads slugs drop apostrophes but keep the hyphen as a word
        # boundary, e.g. "hitchhiker-s-guide" -> "Hitchhiker S Guide".
        # Fold that stray "S" token back on as a possessive.
        title = re.sub(r"\b(\w+) S\b", r"\1's", title)
        return title

    return {idx: slug_to_title(slug) for idx, slug in index_to_slug.items()}


def get_title(book_index_to_title, idx):
    return book_index_to_title.get(idx, f"book_index {idx}")