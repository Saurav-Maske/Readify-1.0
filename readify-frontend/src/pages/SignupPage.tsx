import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/layout/AuthLayout';
import { GoogleButton } from '../components/auth/GoogleButton';
import { Divider } from '../components/ui/Divider';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/auth/PasswordInput';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { UsernameField } from '../components/auth/UsernameField';
import { Button } from '../components/ui/Button';
import { signupSchema, type SignupSchema } from '../lib/validation/authSchemas';
import apiClient from '../lib/api';
import type { AuthResponse, RegisterPayload } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const GOOGLE_OAUTH_URL = `${API_BASE_URL}/auth/google`;

function extractErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? 'Something went wrong. Please try again.';
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const passwordValue = watch('password');

  const onSubmit = async (values: SignupSchema) => {
    setIsSubmitting(true);

    try {
      const payload: RegisterPayload = {
        name: values.fullName,
        username: values.username,
        email: values.email,
        password: values.password,
      };

      const response = await apiClient.post<AuthResponse>('/auth/register', payload);

      localStorage.setItem('readify_token', response.data.token);
      toast.success('Account created successfully.');
      navigate('/home');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
    setIsGoogleLoading(true);
    window.location.href = GOOGLE_OAUTH_URL;
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text">Create your account</h2>
        <p className="mt-1.5 text-sm text-textSecondary">Start your personalized reading journey.</p>
      </div>

      <GoogleButton onClick={handleGoogleSignup} isLoading={isGoogleLoading} />

      <div className="my-6">
        <Divider label="or" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Input
          label="Full name"
          placeholder="Jane Austen"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <UsernameField
              label="Username"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.username?.message}
              onSuggestionSelect={(suggestion) => setValue('username', suggestion, { shouldValidate: true })}
              placeholder="janeausten"
              autoComplete="username"
            />
          )}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <PasswordInput
            label="Password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        <PasswordInput
          label="Confirm password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-textSecondary">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
