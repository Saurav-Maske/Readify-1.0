import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon } from '../components/icons';
import apiClient from '../lib/api';
import type { DiscoverRecommendation } from '../types/discover';

export default function DiscoverPage() {
  const [recommendations, setRecommendations] = useState<DiscoverRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function load() {
      try {
        const res = await apiClient.get<{ recommendations: DiscoverRecommendation[] }>('/discover', {
          params: { limit: 10 },
        });
        if (isCurrent) setRecommendations(res.data.recommendations);
      } catch {
        if (isCurrent) setError('Could not load recommendations right now.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    void load();
    return () => { isCurrent = false; };
  }, []);

  if (isLoading) {
    return <p className="text-textSecondary dark:text-textSecondary-dark">Loading your recommendations...</p>;
  }

  if (error) {
    return <p className="text-textSecondary dark:text-textSecondary-dark">{error}</p>;
  }

  if (recommendations.length === 0) {
    return (
      <p className="text-textSecondary dark:text-textSecondary-dark">
        No recommendations yet - check back after you've read, wishlisted, or reviewed a few books.
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-text dark:text-text-dark">
        <SparklesIcon className="h-5 w-5" />
        Discover
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {recommendations.map((rec) => (
          <Link
            key={rec.bookId}
            to={`/books?id=${rec.bookId}/`}
            className="rounded-xl border border-gray-100 p-3 transition-shadow hover:shadow-md dark:border-gray-800"
          >
            <div className="mb-2 flex aspect-[2/3] items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
              {rec.coverImage ? (
                <img src={rec.coverImage} alt={rec.title} className="h-full w-full rounded-lg object-cover" />
              ) : (
                rec.title.slice(0, 2).toUpperCase()
              )}
            </div>
            <p className="truncate text-sm font-semibold text-text dark:text-text-dark">{rec.title}</p>
            <p className="truncate text-xs text-textSecondary dark:text-textSecondary-dark">{rec.author}</p>
            <p className="mt-1 text-[11px] text-primary">{rec.reason}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}