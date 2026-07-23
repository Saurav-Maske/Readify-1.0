import { Link } from 'react-router-dom';
import { TrendingUpIcon } from '../icons';
import type { TrendingBook } from '../../types/feed';

interface TrendingCardProps {
  books: TrendingBook[];
}

export function TrendingCard({ books }: TrendingCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
        <TrendingUpIcon className="h-4 w-4 text-primary" />
        Trending This Week
      </div>

      <ul className="divide-y divide-gray-100">
        {books.map((book) => (
          <li key={book.id}>
            <Link
              to={`/books?id=${book.id}`}
              className="flex items-center gap-3 py-2.5 transition-colors duration-150 hover:bg-gray-50"
            >
              <span className="w-4 text-sm font-semibold text-gray-300">{book.rank}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{book.title}</p>
                <p className="truncate text-xs text-textSecondary">{book.author}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}