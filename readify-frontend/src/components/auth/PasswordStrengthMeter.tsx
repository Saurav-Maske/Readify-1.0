import { evaluatePasswordStrength } from '../../lib/passwordStrength';
import type { PasswordStrengthLevel } from '../../types/auth';

interface PasswordStrengthMeterProps {
  password: string;
}

const levelConfig: Record<PasswordStrengthLevel, { label: string; barColor: string; textColor: string; bars: number }> = {
  weak: { label: 'Weak', barColor: 'bg-error', textColor: 'text-error', bars: 1 },
  medium: { label: 'Medium', barColor: 'bg-yellow-400', textColor: 'text-yellow-600', bars: 2 },
  strong: { label: 'Strong', barColor: 'bg-success', textColor: 'text-success', bars: 3 },
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) {
    return null;
  }

  const { level, requirements } = evaluatePasswordStrength(password);
  const config = levelConfig[level];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2].map((barIndex) => (
            <div
              key={barIndex}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                barIndex < config.bars ? config.barColor : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {requirements.map((requirement) => (
          <li
            key={requirement.label}
            className={`flex items-center gap-1.5 text-xs ${requirement.met ? 'text-success' : 'text-textSecondary'}`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] ${
                requirement.met ? 'bg-success text-white' : 'bg-gray-200 text-transparent'
              }`}
            >
              ✓
            </span>
            {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
