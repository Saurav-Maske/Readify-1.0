interface ChipMultiSelectProps {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function ChipMultiSelect({ options, value, onChange }: ChipMultiSelectProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            aria-pressed={isSelected}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              isSelected
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-text hover:border-primary/40 hover:bg-secondary/5'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}