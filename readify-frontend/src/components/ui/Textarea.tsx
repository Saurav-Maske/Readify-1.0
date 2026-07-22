import { forwardRef, useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className = '', rows = 3, ...rest }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <div
          className={`relative rounded-xl border bg-white transition-all duration-150 focus-within:scale-[1.01] focus-within:shadow-sm ${
            error ? 'border-error' : 'border-gray-200 focus-within:border-primary'
          }`}
        >
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-text placeholder:text-textSecondary/70 focus:outline-none ${className}`}
            {...rest}
          />
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

Textarea.displayName = 'Textarea';