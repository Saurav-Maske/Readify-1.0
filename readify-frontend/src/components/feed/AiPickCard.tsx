import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SparklesIcon } from '../icons';
import type { AiPickSuggestion } from '../../types/feed';

interface AiPickCardProps {
  pick: AiPickSuggestion;
}

export function AiPickCard({ pick }: AiPickCardProps) {
  const [showReason, setShowReason] = useState(false);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-5 text-white shadow-sm"
      onMouseEnter={() => setShowReason(true)}
      onMouseLeave={() => setShowReason(false)}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/90">
        <SparklesIcon className="h-4 w-4" />
        AI Pick For You
      </div>

      <Link to={`/books?id=${pick.id}`} className="flex items-center gap-3">
        {pick.coverImage ? (
          <img
            src={pick.coverImage}
            alt={pick.title}
            className="h-16 w-11 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
            style={{ backgroundColor: pick.coverColor ?? '#111827' }}
          >
            {pick.title.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold hover:underline">{pick.title}</p>
          <p className="truncate text-xs text-white/80">{pick.author}</p>
        </div>
      </Link>

      <button
        type="button"
        onFocus={() => setShowReason(true)}
        onBlur={() => setShowReason(false)}
        onClick={() => setShowReason((open) => !open)}
        aria-expanded={showReason}
        aria-controls="ai-pick-reason-overlay"
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-white/25"
      >
        <SparklesIcon className="h-3.5 w-3.5" />
        Why this recommendation?
      </button>

      {/* Shown directly on top of this card (not a floating popover that can
          spill past its edges into the sidebar/scrollbar) - fades in over the
          whole card while hovering/focusing the button above. */}
      <AnimatePresence>
        {showReason && (
          <motion.div
            id="ai-pick-reason-overlay"
            role="tooltip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-900/95 p-6 text-center backdrop-blur-sm dark:bg-black/95"
          >
            <SparklesIcon className="h-5 w-5 text-white/60" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
              Why this recommendation
            </p>
            <p className="text-sm font-medium leading-relaxed text-white">{pick.reasonText}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}