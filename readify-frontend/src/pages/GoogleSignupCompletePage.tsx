import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/layout/AuthLayout';
import { UsernameField } from '../components/auth/UsernameField';
import { Button } from '../components/ui/Button';
import { googleSignupCompleteSchema, type GoogleSignupCompleteSchema } from '../lib/validation/authSchemas';
import apiClient from '../lib/api';
import type { AuthResponse } from '../types/auth';

function extractErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? 'Something went wrong. Please try again.';
}

export default function GoogleSignupCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleProfile = useMemo(() => {
    const state = location.state as { pendingToken?: string; name?: string; email?: string } | null;

    return {
      pendingToken: state?.pendingToken ?? '',
      name: state?.name ?? '',
      email: state?.email ?? '',
    };
  }, [location.state]);

  useEffect(() => {
    if (!googleProfile.pendingToken || !googleProfile.name || !googleProfile.email) {
      navigate('/login', { replace: true });
    }
  }, [googleProfile, navigate]);

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<GoogleSignupCompleteSchema>({
    resolver: zodResolver(googleSignupCompleteSchema),
    defaultValues: { username: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: GoogleSignupCompleteSchema) => {
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<AuthResponse>('/auth/google/complete-signup', {
        pendingToken: googleProfile.pendingToken,
        username: values.username,
      });

      localStorage.setItem('readify_token', response.data.token);
      toast.success('Account created successfully.');
      navigate('/');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!googleProfile.pendingToken || !googleProfile.name || !googleProfile.email) {
    return null;
  }

  return (
    <AuthLayout>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-lg font-semibold text-primary">
          {googleProfile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-text">Welcome, {googleProfile.name.split(' ')[0]}</h2>
          <p className="text-sm text-textSecondary">{googleProfile.email}</p>
        </div>
      </div>

      <p className="mb-6 text-sm text-textSecondary">
        Pick a username to finish setting up your account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

        <Button type="submit" isLoading={isSubmitting}>
          Finish setting up
        </Button>
      </form>
    </AuthLayout>
  );
}
