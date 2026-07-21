import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, rightElement, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
        <div
          className={`relative flex items-center rounded-xl border bg-white transition-all duration-150 focus-within:scale-[1.01] focus-within:shadow-sm ${
            error ? 'border-error' : 'border-gray-200 focus-within:border-primary'
          }`}
        >
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full rounded-xl bg-transparent px-4 py-3 text-sm text-text placeholder:text-textSecondary/70 focus:outline-none ${
              rightElement ? 'pr-11' : ''
            } ${className}`}
            {...rest}
          />
          {rightElement && <div className="absolute right-3 flex items-center">{rightElement}</div>}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-error">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="mt-1.5 text-xs text-textSecondary">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
