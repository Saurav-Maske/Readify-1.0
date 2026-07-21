import { motion } from 'framer-motion';

interface GoogleButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
}

export function GoogleButton({ onClick, isLoading = false, label = 'Continue with Google' }: GoogleButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      whileHover={{ y: isLoading ? 0 : -1 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-text shadow-sm transition-colors duration-150 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary"
        />
      ) : (
        <GoogleIcon />
      )}
      <span>{label}</span>
    </motion.button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.29-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
