import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { Avatar } from '../components/ui/Avatar';
import { StarRating } from '../components/ui/StarRating';
import { SearchIcon, CloseIcon } from '../components/icons';
import apiClient from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? 'http://localhost:4000';
const DEBOUNCE_MS = 350;

function resolveProfilePicture(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

interface UserResult {
  userId: number;
  name: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  isSelf: boolean;
  isFollowing: boolean;
}

interface BookResult {
  bookId: number;
  title: string;
  author: string;
  genre: string | null;
  coverImage: string | null;
  rating: number | null;
  noOfRatings: number | null;
}

interface SearchResponse {
  mode: 'users' | 'books';
  query: string;
  results: UserResult[] | BookResult[];
}

type SearchStatus = 'idle' | 'loading' | 'error' | 'done';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [mode, setMode] = useState<'users' | 'books'>('books');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [bookResults, setBookResults] = useState<BookResult[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setStatus('idle');
      setUserResults([]);
      setBookResults([]);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setStatus('loading');

    const timeoutId = window.setTimeout(() => {
      apiClient
        .get<SearchResponse>('/search', { params: { q: trimmed, limit: 20 } })
        .then((response) => {
          if (requestIdRef.current !== currentRequestId) return;
          setMode(response.data.mode);
          if (response.data.mode === 'users') {
            setUserResults(response.data.results as UserResult[]);
            setBookResults([]);
          } else {
            setBookResults(response.data.results as BookResult[]);
            setUserResults([]);
          }
          setStatus('done');
        })
        .catch(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setStatus('error');
          setUserResults([]);
          setBookResults([]);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const handleToggleFollow = async (target: UserResult) => {
    const wasFollowing = target.isFollowing;
    setUserResults((current) =>
      current.map((u) => (u.userId === target.userId ? { ...u, isFollowing: !wasFollowing } : u))
    );
    try {
      if (wasFollowing) {
        await apiClient.delete(`/users/${encodeURIComponent(target.username)}/follow`);
        toast.success('Unfollowed');
      } else {
        await apiClient.post(`/users/${encodeURIComponent(target.username)}/follow`);
        toast.success('Following');
      }
    } catch (error) {
      setUserResults((current) =>
        current.map((u) => (u.userId === target.userId ? { ...u, isFollowing: wasFollowing } : u))
      );
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error('Please log in to follow readers.');
      } else {
        toast.error('Unable to update follow status. Please try again.');
      }
    }
  };

  const isSearchingUsers = query.trim().startsWith('@');

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">Search</h1>
        <p className="mt-1 text-sm text-textSecondary dark:text-textSecondary-dark">
          Search for a book by title or author, or start with <span className="font-semibold text-primary">@</span>{' '}
          to find a person by name or username.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary dark:text-textSecondary-dark" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search books, or type @ to search people..."
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-card dark:bg-card-dark py-3 pl-11 pr-11 text-sm text-text dark:text-text-dark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-textSecondary dark:text-textSecondary-dark hover:text-text dark:hover:text-text-dark"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {status === 'idle' && (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-card dark:bg-card-dark p-10 text-center">
          <p className="text-sm font-medium text-text dark:text-text-dark">Find people and books</p>
          <p className="mt-1 text-sm text-textSecondary dark:text-textSecondary-dark">
            Try "@jane" to find a reader, or "Dune" to find a book.
          </p>
        </div>
      )}

      {status === 'loading' && (
        <p className="text-sm text-textSecondary dark:text-textSecondary-dark">
          Searching for {isSearchingUsers ? 'people' : 'books'}...
        </p>
      )}

      {status === 'error' && (
        <p className="text-sm text-error">Unable to search right now. Please try again.</p>
      )}

      {status === 'done' && mode === 'users' && (
        <div className="space-y-3">
          {userResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-card dark:bg-card-dark p-10 text-center">
              <p className="text-sm font-medium text-text dark:text-text-dark">No readers found.</p>
              <p className="mt-1 text-sm text-textSecondary dark:text-textSecondary-dark">
                Double check the username or try a different name.
              </p>
            </div>
          ) : (
            userResults.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-card dark:bg-card-dark p-4 shadow-sm"
              >
                <Link to={`/profile/${encodeURIComponent(user.username)}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={user.name} src={resolveProfilePicture(user.profilePicture)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text dark:text-text-dark hover:underline">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-textSecondary dark:text-textSecondary-dark">@{user.username}</p>
                    {user.bio && (
                      <p className="mt-1 truncate text-xs text-textSecondary dark:text-textSecondary-dark">{user.bio}</p>
                    )}
                  </div>
                </Link>
                {!user.isSelf && (
                  <button
                    type="button"
                    onClick={() => handleToggleFollow(user)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                      user.isFollowing
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-textSecondary dark:text-textSecondary-dark'
                        : 'border-primary text-primary hover:bg-secondary/10'
                    }`}
                  >
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {status === 'done' && mode === 'books' && (
        <div className="space-y-3">
          {bookResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-card dark:bg-card-dark p-10 text-center">
              <p className="text-sm font-medium text-text dark:text-text-dark">No books found.</p>
              <p className="mt-1 text-sm text-textSecondary dark:text-textSecondary-dark">
                Try searching a different title or author.
              </p>
            </div>
          ) : (
            bookResults.map((book) => (
              <Link
                key={book.bookId}
                to={`/books?id=${book.bookId}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-card dark:bg-card-dark p-4 shadow-sm transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} className="h-16 w-11 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
                    {book.title.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text dark:text-text-dark">{book.title}</p>
                  <p className="truncate text-xs text-textSecondary dark:text-textSecondary-dark">{book.author}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating value={Math.round(book.rating ?? 0)} />
                    {book.genre && (
                      <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {book.genre}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}