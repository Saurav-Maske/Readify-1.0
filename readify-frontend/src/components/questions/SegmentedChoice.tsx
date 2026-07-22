interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SegmentedChoiceProps<T extends string> {
  name: string;
  options: SegmentedOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
}

export function SegmentedChoice<T extends string>({
  name,
  options,
  value,
  onChange,
  error,
}: SegmentedChoiceProps<T>) {
  return (
    <div>
      <div role="radiogroup" aria-label={name} className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-150 ${
                isSelected
                  ? 'border-primary bg-secondary/10 ring-1 ring-primary'
                  : 'border-gray-200 bg-white hover:border-primary/40'
              }`}
            >
              <span className={`block font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>
                {option.label}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-xs text-textSecondary">{option.description}</span>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}