import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { AuthLayout } from '../components/layout/AuthLayout';
import { UsernameField } from '../components/auth/UsernameField';
import { Button } from '../components/ui/Button';
import { googleSignupCompleteSchema, type GoogleSignupCompleteSchema } from '../lib/validation/authSchemas';
import apiClient from '../lib/api';
import { showError, showSuccess } from '../lib/popup';

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const message = data?.error || data?.message || data?.detail;

    if (message) return message;

    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      return 'Unable to connect to the server. Please check your connection and try again.';
    }
  }

  return 'Unable to connect to the server. Please check your connection and try again.';
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
      const response = await apiClient.post('/auth/google/complete-signup', {
        pendingToken: googleProfile.pendingToken,
        username: values.username,
      });

      localStorage.setItem('readify_token', response.data.token);
      showSuccess('Account created successfully.');
      navigate('/question');
    } catch (error) {
      showError(extractErrorMessage(error));
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
