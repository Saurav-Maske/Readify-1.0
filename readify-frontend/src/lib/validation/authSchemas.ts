import { z } from 'zod';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const PASSWORD_RULES = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

const usernameField = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be under 20 characters')
  .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, and underscores');

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(PASSWORD_RULES.uppercase, 'Include at least one uppercase letter')
  .regex(PASSWORD_RULES.lowercase, 'Include at least one lowercase letter')
  .regex(PASSWORD_RULES.number, 'Include at least one number')
  .regex(PASSWORD_RULES.special, 'Include at least one special character');

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(60, 'Full name must be under 60 characters'),
    username: usernameField,
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupSchema = z.infer<typeof signupSchema>;

export const googleSignupCompleteSchema = z
  .object({
    username: usernameField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type GoogleSignupCompleteSchema = z.infer<typeof googleSignupCompleteSchema>;
