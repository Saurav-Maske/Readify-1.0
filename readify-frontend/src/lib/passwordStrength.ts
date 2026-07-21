import type { PasswordStrengthLevel } from '../types/auth';

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: number;
  level: PasswordStrengthLevel;
  requirements: PasswordRequirement[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = requirements.filter((requirement) => requirement.met).length;

  let level: PasswordStrengthLevel = 'weak';
  if (score >= 5) {
    level = 'strong';
  } else if (score >= 3) {
    level = 'medium';
  }

  return { score, level, requirements };
}
