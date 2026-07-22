import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface QuestionSectionProps {
  index: number;
  title: string;
  caption?: string;
  optional?: boolean;
  children: ReactNode;
}

export function QuestionSection({ index, title, caption, optional = false, children }: QuestionSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-gray-100 bg-card p-6 shadow-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-semibold text-primary">
            {index}
          </span>
          <div>
            <h3 className="text-base font-semibold text-text">{title}</h3>
            {caption && <p className="mt-1 text-sm italic text-textSecondary">{caption}</p>}
          </div>
        </div>
        {optional && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-textSecondary">
            Optional
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}