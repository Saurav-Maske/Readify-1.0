import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/layout/AuthLayout';
import { PasswordInput } from '../components/auth/PasswordInput';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { UsernameField } from '../components/auth/UsernameField';
import { Button } from '../components/ui/Button';
import { googleSignupCompleteSchema, type GoogleSignupCompleteSchema } from '../lib/validation/authSchemas';
import apiClient from '../lib/api';
import type { AuthResponse, GoogleRegisterPayload } from '../types/auth';

function extractErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? 'Something went wrong. Please try again.';
}

export default function GoogleSignupCompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleProfile = useMemo(
    () => ({
      name: searchParams.get('name') ?? '',
      email: searchParams.get('email') ?? '',
      avatarUrl: searchParams.get('avatar') ?? '',
    }),
    [searchParams]
  );

  useEffect(() => {
    if (!googleProfile.name || !googleProfile.email) {
      navigate('/signup', { replace: true });
    }
  }, [googleProfile, navigate]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoogleSignupCompleteSchema>({
    resolver: zodResolver(googleSignupCompleteSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const passwordValue = watch('password');

  const onSubmit = async (values: GoogleSignupCompleteSchema) => {
    setIsSubmitting(true);

    try {
      const payload: GoogleRegisterPayload = {
        name: googleProfile.name,
        username: values.username,
        email: googleProfile.email,
        password: values.password,
        provider: 'google',
      };

      const response = await apiClient.post<AuthResponse>('/auth/register', payload);

      localStorage.setItem('readify_token', response.data.token);
      toast.success('Account created successfully.');
      navigate('/login');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!googleProfile.name || !googleProfile.email) {
    return null;
  }

  return (
    <AuthLayout>
      <div className="mb-8 flex items-center gap-3">
        {googleProfile.avatarUrl ? (
          <img src={googleProfile.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-lg font-semibold text-primary">
            {googleProfile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-text">Welcome, {googleProfile.name.split(' ')[0]}</h2>
          <p className="text-sm text-textSecondary">{googleProfile.email}</p>
        </div>
      </div>

      <p className="mb-6 text-sm text-textSecondary">
        Just pick a username and password to finish setting up your account.
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
          Finish setting up
        </Button>
      </form>
    </AuthLayout>
  );
}
