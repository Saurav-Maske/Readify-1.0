import { StarIcon } from '../icons';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
}

const sizeClasses: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
};

export function StarRating({ value, onChange, size = 'sm' }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {stars.map((star) => {
        const filled = star <= value;
        const icon = (
          <StarIcon
            filled={filled}
            className={`${sizeClasses[size]} ${filled ? 'text-amber-400' : 'text-gray-300'}`}
          />
        );

        if (!onChange) {
          return <span key={star}>{icon}</span>;
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
            className="rounded p-0.5"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}