import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DropdownMenuProps {
  trigger: ReactNode;
  align?: 'left' | 'right';
  children: (close: () => void) => ReactNode;
}

export function DropdownMenu({ trigger, align = 'right', children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="More options"
        className="flex rounded-lg p-1 text-textSecondary dark:text-textSecondary-dark transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text dark:hover:text-text-dark"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          className={`absolute z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-card dark:bg-card-dark py-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setIsOpen(false))}
        </div>
      )}
    </div>
  );
}