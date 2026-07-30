import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { InfoIcon, SparklesIcon } from '../components/icons';
import { StarRating } from '../components/ui/StarRating';
import { formatCount } from '../lib/formatCount';
import apiClient from '../lib/api';
import type { DiscoverRecommendation } from '../types/discover';

function DiscoverBookCard({ rec, index }: { rec: DiscoverRecommendation; index: number }) {
  const [showReason, setShowReason] = useState(false);
  const rating = rec.rating ?? 0;
  const noOfRatings = rec.noOfRatings ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 10) * 0.03 }}
      className="group relative flex flex-col rounded-2xl border border-gray-100 bg-card shadow-sm transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-card-dark"
    >
      <Link to={`/books?id=${rec.bookId}`} className="block">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-800">
          <span className="absolute right-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/60 px-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            #{rec.rank}
          </span>
          {rec.coverImage ? (
            <img
              src={rec.coverImage}
              alt={rec.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-lg font-semibold text-white">
              {rec.title.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={`/books?id=${rec.bookId}`}>
          <p className="truncate text-sm font-semibold text-text hover:underline dark:text-text-dark" title={rec.title}>
            {rec.title}
          </p>
        </Link>
        <p className="truncate text-xs text-textSecondary dark:text-textSecondary-dark" title={rec.author}>
          {rec.author}
        </p>

        <div className="mt-0.5 flex items-center gap-1.5">
          <StarRating value={Math.round(rating)} />
          <span className="text-xs font-semibold text-text dark:text-text-dark">{rating.toFixed(1)}</span>
          <span className="text-xs text-textSecondary dark:text-textSecondary-dark">
            ({formatCount(noOfRatings)})
          </span>
        </div>

        {/* relative here (not on the button) so the tooltip below can span
            the full card width and stay centered on the card, instead of
            being centered on the button - which sits near the right edge
            of this row and was pushing the tooltip off to the right. */}
        <div className="relative mt-1.5 flex items-center gap-1.5">
          <span className="truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-textSecondary dark:bg-gray-800 dark:text-textSecondary-dark">
            {rec.reasonLabel}
          </span>
          <button
            type="button"
            aria-label="Why this recommendation?"
            aria-describedby={showReason ? `discover-reason-${rec.bookId}` : undefined}
            onMouseEnter={() => setShowReason(true)}
            onMouseLeave={() => setShowReason(false)}
            onFocus={() => setShowReason(true)}
            onBlur={() => setShowReason(false)}
            onClick={() => setShowReason((open) => !open)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-textSecondary transition-colors duration-150 hover:bg-gray-100 hover:text-primary dark:text-textSecondary-dark dark:hover:bg-gray-800"
          >
            <InfoIcon className="h-3.5 w-3.5" />
          </button>

          <AnimatePresence>
            {showReason && (
              <motion.div
                id={`discover-reason-${rec.bookId}`}
                role="tooltip"
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-xl bg-gray-900 px-3.5 py-3 text-white shadow-xl dark:bg-black"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  Why this recommendation
                </p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-white">{rec.reasonText}</p>
                <div className="absolute right-3 top-full h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-gray-900 dark:bg-black" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscoverPage() {
  const [recommendations, setRecommendations] = useState<DiscoverRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function load() {
      try {
        const res = await apiClient.get<{ recommendations: DiscoverRecommendation[] }>('/discover', {
          params: { limit: 30 },
        });
        if (isCurrent) setRecommendations(res.data.recommendations);
      } catch {
        if (isCurrent) setError('Could not load recommendations right now.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    void load();
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <div>
      {/* Hero header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
          <SparklesIcon className="h-4 w-4" />
          Discover
        </div>
        <h1 className="relative mt-2 text-2xl font-bold sm:text-3xl">Picked for your reading taste</h1>
        <p className="relative mt-2 max-w-xl text-sm text-white/85">
          A fresh set of books curated from what you've read, wishlisted, and reviewed - hover the{' '}
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 align-middle text-[10px]">
            i
          </span>{' '}
          on any pick to see why it's here.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <p className="text-textSecondary dark:text-textSecondary-dark">{error}</p>
      )}

      {!isLoading && !error && recommendations.length === 0 && (
        <p className="text-textSecondary dark:text-textSecondary-dark">
          No recommendations yet - check back after you've read, wishlisted, or reviewed a few books.
        </p>
      )}

      {!isLoading && !error && recommendations.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {recommendations.map((rec, index) => (
            <DiscoverBookCard key={rec.bookId} rec={rec} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}