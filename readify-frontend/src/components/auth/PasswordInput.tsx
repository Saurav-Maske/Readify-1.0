import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Input } from '../ui/Input';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, ...rest }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <Input
        ref={ref}
        label={label}
        error={error}
        hint={hint}
        type={isVisible ? 'text' : 'password'}
        autoComplete="new-password"
        rightElement={
          <button
            type="button"
            onClick={() => setIsVisible((previous) => !previous)}
            className="rounded-md p-1 text-textSecondary transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
        {...rest}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10.5 7 10.5 7a17.9 17.9 0 0 1-3.4 4.4M6.4 6.4A17.6 17.6 0 0 0 1.5 12s4 7 10.5 7c1.6 0 3-.3 4.3-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
