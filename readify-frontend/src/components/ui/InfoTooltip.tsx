import { useState } from 'react';

interface InfoTooltipProps {
  message: string;
}

export function InfoTooltip({ message }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={message}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-textSecondary transition-colors duration-150 hover:border-primary hover:text-primary"
      >
        i
      </button>

      {isVisible && (
        <span className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-center text-xs text-white shadow-lg">
          {message}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-gray-900" />
        </span>
      )}
    </span>
  );
}