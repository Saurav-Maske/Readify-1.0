import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { StarRating } from "../components/ui/StarRating";
import { BookOpen, TrendingUp, Flame, BarChart3, Plus, X } from "lucide-react";

// ---- Types ----
interface ShelfBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  rating: number; // 0-5
  progress: number; // 0-100, only relevant for "currently-reading"
}

interface ShelfStats {
  totalRead: number;
  thisYear: number;
  dayStreak: number;
  pagesRead: number;
}

type ShelfTab = "currently-reading" | "want-to-read" | "finished";

const TABS: { key: ShelfTab; label: string }[] = [
  { key: "currently-reading", label: "Currently Reading" },
  { key: "want-to-read", label: "Want to Read" },
  { key: "finished", label: "Finished" },
];

export default function MyShelfPage() {
  const [activeTab, setActiveTab] = useState<ShelfTab>("currently-reading");
  const [stats, setStats] = useState<ShelfStats | null>(null);
  const [booksByTab, setBooksByTab] = useState<Record<ShelfTab, ShelfBook[]>>({
    "currently-reading": [],
    "want-to-read": [],
    finished: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Add Book Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newStatus, setNewStatus] = useState<ShelfTab>("want-to-read");
  const [newRating, setNewRating] = useState(5);
  const [newProgress, setNewProgress] = useState(0);

  useEffect(() => {
    // ============================================================
    // BACKEND INTEGRATION: Fetch shelf stats & books on mount
    // ============================================================
    // const loadShelf = async () => {
    //   setIsLoading(true);
    //   try {
    //     const [statsRes, booksRes] = await Promise.all([
    //       api.get("/users/me/shelf/stats"), // Returns ShelfStats
    //       api.get("/users/me/shelf/books"), // Returns Record<ShelfTab, ShelfBook[]>
    //     ]);
    //     setStats(statsRes.data);
    //     setBooksByTab(booksRes.data);
    //   } catch (err) {
    //     console.error("Failed to load bookshelf data", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // loadShelf();
    // ============================================================

    // Temporary mock data with items across all tabs for testing
    setStats({ totalRead: 312, thisYear: 47, dayStreak: 47, pagesRead: 47000 });
    setBooksByTab({
      "currently-reading": [
        {
          id: "1",
          title: "Tomorrow, and Tomorrow, and Tomorrow",
          author: "Gabrielle Zevin",
          coverUrl: "",
          rating: 5,
          progress: 68,
        },
        {
          id: "2",
          title: "The Atlas Six",
          author: "Olivie Blake",
          coverUrl: "",
          rating: 5,
          progress: 32,
        },
        {
          id: "3",
          title: "The Covenant of Water",
          author: "Abraham Verghese",
          coverUrl: "",
          rating: 5,
          progress: 15,
        },
      ],
      "want-to-read": [
        {
          id: "4",
          title: "Atomic Habits",
          author: "James Clear",
          coverUrl: "",
          rating: 0,
          progress: 0,
        },
        {
          id: "5",
          title: "Project Hail Mary",
          author: "Andy Weir",
          coverUrl: "",
          rating: 0,
          progress: 0,
        },
      ],
      finished: [
        {
          id: "6",
          title: "Dune",
          author: "Frank Herbert",
          coverUrl: "",
          rating: 5,
          progress: 100,
        },
      ],
    });
    setIsLoading(false);
  }, []);

  const formatPages = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);

  const statCards = stats
    ? [
        { icon: BookOpen, value: stats.totalRead, label: "Total Read" },
        { icon: TrendingUp, value: stats.thisYear, label: "This Year" },
        { icon: Flame, value: stats.dayStreak, label: "Day Streak" },
        { icon: BarChart3, value: formatPages(stats.pagesRead), label: "Pages Read" },
      ]
    : [];

  const activeBooks = booksByTab[activeTab] ?? [];

  // Handle Add Book Submission
  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) return;

    const newBookItem: ShelfBook = {
      id: Date.now().toString(),
      title: newTitle,
      author: newAuthor,
      coverUrl: "",
      rating: newRating,
      progress: newStatus === "currently-reading" ? newProgress : newStatus === "finished" ? 100 : 0,
    };

    // ============================================================
    // BACKEND INTEGRATION: POST new book
    // ============================================================
    // try {
    //   const response = await api.post("/users/me/shelf/books", {
    //     title: newTitle,
    //     author: newAuthor,
    //     status: newStatus,
    //     rating: newRating,
    //     progress: newBookItem.progress,
    //   });
    //   // Use server response ID if available
    //   newBookItem.id = response.data.id;
    // } catch (err) {
    //   console.error("Failed to add book", err);
    //   return;
    // }
    // ============================================================

    // Update local state
    setBooksByTab((prev) => ({
      ...prev,
      [newStatus]: [newBookItem, ...prev[newStatus]],
    }));

    // Reset Form & Close Modal
    setNewTitle("");
    setNewAuthor("");
    setNewProgress(0);
    setNewRating(5);
    setIsModalOpen(false);
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

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 h-[120px] animate-pulse" />
              ))
            : statCards.map(({ icon: Icon, value, label }) => (
                <div key={label} className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-indigo-600" />
                  </div>
                  <div className="text-2xl font-bold text-text dark:text-text-dark">{value}</div>
                  <div className="text-sm text-textSecondary dark:text-textSecondary-dark">{label}</div>
                </div>
              ))}
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
        ) : activeBooks.length === 0 ? (
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center text-gray-400 dark:text-gray-500 shadow-sm">
            No books here yet. Use "Add Book" to start filling this shelf.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeBooks.map((book) => (
              <div key={book.id} className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex gap-4 shadow-sm">
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
                  <div className="mt-1">
                    <StarRating {...({ rating: book.rating, readOnly: true, size: "sm" } as any)} />
                  </div>

                  {activeTab === "currently-reading" && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-textSecondary dark:text-textSecondary-dark mb-1">
                        <span>Progress</span>
                        <span className="text-indigo-600 font-medium">{book.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${book.progress}%` }}
                        />
                      </div>
                    </div>
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
                    <option value="want-to-read">Want to Read</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>

                {newStatus === "currently-reading" && (
                  <div>
                    <label className="block text-xs font-semibold text-textSecondary dark:text-textSecondary-dark uppercase tracking-wider mb-1">
                      Reading Progress (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newProgress}
                      onChange={(e) => setNewProgress(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-text-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

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
                    className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                  >
                    Save Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}