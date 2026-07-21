import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Input } from '../ui/Input';
import { useUsernameAvailability, type UsernameCheckStatus } from '../../hooks/useUsernameAvailability';

interface UsernameFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelect?: (suggestion: string) => void;
}

export const UsernameField = forwardRef<HTMLInputElement, UsernameFieldProps>(
  ({ label = 'Username', error, value, onChange, onSuggestionSelect, ...rest }, ref) => {
    const { status, suggestions } = useUsernameAvailability(value);

    return (
      <div>
        <Input
          ref={ref}
          label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          error={error}
          rightElement={<UsernameStatusIcon status={status} />}
          {...rest}
        />
        {!error && status === 'available' && (
          <p className="mt-1.5 text-xs font-medium text-success">Username available</p>
        )}
        {!error && status === 'taken' && (
          <div className="mt-1.5 space-y-1.5">
            <p className="text-xs font-medium text-error">Username already taken</p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onSuggestionSelect?.(suggestion)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-primary hover:text-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

UsernameField.displayName = 'UsernameField';

function UsernameStatusIcon({ status }: { status: UsernameCheckStatus }) {
  if (status === 'checking') {
    return (
      <span
        aria-hidden="true"
        className="block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary"
      />
    );
  }

  if (status === 'available') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  if (status === 'taken') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-error"
        aria-hidden="true"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }

  return null;
}
