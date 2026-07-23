import { Link } from 'react-router-dom';
import { SparklesIcon } from '../icons';
import type { AiPickSuggestion } from '../../types/feed';

interface AiPickCardProps {
  pick: AiPickSuggestion;
}

export function AiPickCard({ pick }: AiPickCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary to-secondary p-5 text-white shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/90">
        <SparklesIcon className="h-4 w-4" />
        AI Pick For You
      </div>

      <Link to={`/books?id=${pick.id}`} className="flex items-center gap-3">
        <div
          className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
          style={{ backgroundColor: pick.coverColor ?? '#111827' }}
        >
          {pick.title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold hover:underline">{pick.title}</p>
          <p className="truncate text-xs text-white/80">{pick.author}</p>
        </div>
      </Link>

      <p className="mt-3 text-xs text-white/85">{pick.reason}</p>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-white/25"
      >
        <SparklesIcon className="h-3.5 w-3.5" />
        Why this recommendation?
      </button>
    </div>
  );
}