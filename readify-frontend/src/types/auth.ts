export interface GoogleProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface UsernameAvailabilityResponse {
  available: boolean;
  suggestions: string[];
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface GoogleRegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  provider: 'google';
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';
