import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Plus, X, CheckCircle2, Trash2 } from "lucide-react";
import { NewEntryModal } from "../components/feed/NewEntryModal";
import type { CreateEntryPayload } from "../types/feed";
import apiClient from "../lib/api";

interface ShelfBook {
  bookId: number;
  title: string;
  author: string;
  coverUrl: string;
  status: ShelfTab;
}

type ShelfTab = "currently-reading" | "want-to-read" | "finished";

interface BackendShelfBook {
  bookId: number;
  title: string;
  author: string;
  coverImage: string | null;
}

interface BackendShelfResponse {
  "currently-reading": BackendShelfBook[];
  "want-to-read": BackendShelfBook[];
  finished: BackendShelfBook[];
}

const TABS: { key: ShelfTab; label: string }[] = [
  { key: "currently-reading", label: "Currently Reading" },
  { key: "want-to-read", label: "Wishlist" },
  { key: "finished", label: "Finished" },
];

function toShelfBook(book: BackendShelfBook, status: ShelfTab): ShelfBook {
  return {
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    coverUrl: book.coverImage ?? "",
    status,
  };
}

/**
 * True when a request failed because the backend couldn't be reached at all
 * (connection refused, DNS failure, timeout, CORS, etc) - as opposed to a
 * real server response like a 401/500.
 */
function isBackendUnreachable(error: unknown): boolean {
  if (isAxiosError(error)) {
    return !error.response;
  }
  return false;
}

export default function MyShelfPage() {
  const [activeTab, setActiveTab] = useState<ShelfTab>("currently-reading");
  const [booksByTab, setBooksByTab] = useState<Record<ShelfTab, ShelfBook[]>>({
    "currently-reading": [],
    "want-to-read": [],
    finished: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newStatus, setNewStatus] = useState<ShelfTab>("want-to-read");
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isFinishPromptOpen, setIsFinishPromptOpen] = useState(false);
  const [bookToFinish, setBookToFinish] = useState<ShelfBook | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'post' | 'review'>('review');
  const [composerPrefill, setComposerPrefill] = useState<{ title: string; author: string } | null>(null);

  const loadShelf = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await apiClient.get<BackendShelfResponse>("/users/me/shelf");
      setBooksByTab({
        "currently-reading": response.data["currently-reading"].map((b) => toShelfBook(b, "currently-reading")),
        "want-to-read": response.data["want-to-read"].map((b) => toShelfBook(b, "want-to-read")),
        finished: response.data.finished.map((b) => toShelfBook(b, "finished")),
      });
    } catch (error) {
      if (isBackendUnreachable(error)) {
        setLoadError("Backend isn't reachable right now. Please try again shortly.");
      } else {
        setLoadError("Unable to load your bookshelf. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadShelf();
  }, []);

  const activeBooks = booksByTab[activeTab] ?? [];

  // Handle Add Book Submission
  const handleAddBookSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim() || isAddingBook) return;

    setIsAddingBook(true);
    try {
      const response = await apiClient.post<{ book: BackendShelfBook; status: ShelfTab }>("/users/me/shelf", {
        status: newStatus,
        title: newTitle.trim(),
        author: newAuthor.trim(),
      });

      const newBookItem = toShelfBook(response.data.book, newStatus);
      setBooksByTab((prev) => ({
        ...prev,
        // Adding a new "currently reading" book replaces whatever was there before,
        // matching the backend's one-current-book-per-user rule.
        [newStatus]:
          newStatus === "currently-reading"
            ? [newBookItem]
            : [newBookItem, ...prev[newStatus].filter((book) => book.bookId !== newBookItem.bookId)],
      }));

      setNewTitle("");
      setNewAuthor("");
      setIsModalOpen(false);
      toast.success("Book added to your shelf!");
    } catch {
      toast.error("Unable to add this book. Please try again.");
    } finally {
      setIsAddingBook(false);
    }
  };

  const handleMoveToFinished = async (bookId: number) => {
    const bookToMove = booksByTab["currently-reading"].find((book) => book.bookId === bookId);
    if (!bookToMove) return;

    try {
      await apiClient.patch(`/users/me/shelf/${bookId}/finish`);

      setBooksByTab((prev) => ({
        ...prev,
        "currently-reading": prev["currently-reading"].filter((book) => book.bookId !== bookId),
        finished: [{ ...bookToMove, status: "finished" }, ...prev.finished],
      }));

      setBookToFinish(bookToMove);
      setIsFinishPromptOpen(true);
    } catch {
      toast.error("Unable to update this book. Please try again.");
    }
  };

  const handleRemoveFromWishlist = async (bookId: number) => {
    try {
      await apiClient.delete(`/users/me/shelf/want-to-read/${bookId}`);
      setBooksByTab((prev) => ({
        ...prev,
        "want-to-read": prev["want-to-read"].filter((item) => item.bookId !== bookId),
      }));
    } catch {
      toast.error("Unable to remove this book. Please try again.");
    }
  };

  const handleCreateEntry = async (payload: CreateEntryPayload) => {
    if (!payload.content.trim()) return;

    try {
      if (payload.isReview) {
        await apiClient.post("/reviews", {
          rating: payload.rating,
          review: payload.content,
          title: payload.bookTitle,
          author: payload.bookAuthor,
        });
        toast.success("Review published!");
      } else {
        await apiClient.post("/posts", {
          caption: payload.content,
          visibility: payload.visibility === "only_me" ? "JUST_ME" : payload.visibility.toUpperCase(),
        });
        toast.success("Posted!");
      }
    } catch {
      toast.error("Unable to publish. Please try again.");
    } finally {
      setIsComposerOpen(false);
      setComposerPrefill(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text dark:text-text-dark">My Bookshelf</h1>
            <p className="text-textSecondary dark:text-textSecondary-dark mt-1">Your personal reading collection</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Book
          </button>
        </div>

        {/* Interactive Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {tab.label} <span className="text-gray-400 dark:text-gray-600">({booksByTab[tab.key]?.length ?? 0})</span>
            </button>
          ))}
        </div>

        {/* Book grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 h-[140px] animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center text-sm text-error shadow-sm">
            {loadError}
          </div>
        ) : activeBooks.length === 0 ? (
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center text-gray-400 dark:text-gray-500 shadow-sm">
            No books here yet. Use "Add Book" to start filling this shelf.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeBooks.map((book) => (
              <div key={book.bookId} className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex gap-4 shadow-sm">
                <div className="w-14 h-20 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>No Cover</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text dark:text-text-dark text-sm leading-snug line-clamp-2">{book.title}</h3>
                  <p className="text-xs text-textSecondary dark:text-textSecondary-dark mt-0.5">{book.author}</p>

                  {activeTab === "currently-reading" && (
                    <button
                      type="button"
                      onClick={() => handleMoveToFinished(book.bookId)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950"
                    >
                      <CheckCircle2 size={14} />
                      Finished reading
                    </button>
                  )}

                  {activeTab === "want-to-read" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFromWishlist(book.bookId)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Book Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-card-dark rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold text-text dark:text-text-dark mb-4">Add Book to Shelf</h2>

              <form onSubmit={handleAddBookSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary dark:text-textSecondary-dark uppercase tracking-wider mb-1">
                    Book Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., The Hobbit"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-text-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary dark:text-textSecondary-dark uppercase tracking-wider mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    required
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g., J.R.R. Tolkien"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-text-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary dark:text-textSecondary-dark uppercase tracking-wider mb-1">
                    Shelf Category
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ShelfTab)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="currently-reading">Currently Reading</option>
                    <option value="want-to-read">Wishlist</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-textSecondary dark:text-textSecondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingBook}
                    className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAddingBook ? "Saving..." : "Save Book"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isFinishPromptOpen && bookToFinish && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-card-dark rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h2 className="text-xl font-bold text-text dark:text-text-dark">Finished reading?</h2>
              <p className="mt-2 text-sm text-textSecondary dark:text-textSecondary-dark">
                Would you like to leave a review for {bookToFinish.title} and share your thoughts?
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFinishPromptOpen(false);
                    setBookToFinish(null);
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-textSecondary hover:bg-gray-100 dark:text-textSecondary-dark dark:hover:bg-gray-800"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposerPrefill({ title: bookToFinish.title, author: bookToFinish.author });
                    setComposerMode('review');
                    setIsComposerOpen(true);
                    setIsFinishPromptOpen(false);
                    setBookToFinish(null);
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Write a review
                </button>
              </div>
            </div>
          </div>
        )}

        <NewEntryModal
          isOpen={isComposerOpen}
          onClose={() => {
            setIsComposerOpen(false);
            setComposerPrefill(null);
          }}
          onSubmit={handleCreateEntry}
          initialMode={composerMode}
          initialBookTitle={composerPrefill?.title ?? ""}
          initialBookAuthor={composerPrefill?.author ?? ""}
        />
      </div>
    </DashboardLayout>
  );
}