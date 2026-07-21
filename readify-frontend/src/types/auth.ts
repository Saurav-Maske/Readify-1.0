export interface GoogleProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface UsernameAvailabilityResponse {
  available: boolean;
  reason?: string;
}

export interface AuthUser {
  userId: string;
  name: string;
  username: string;
  gmail: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';
