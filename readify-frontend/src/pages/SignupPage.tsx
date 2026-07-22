import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import axios from 'axios';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Divider } from '../components/ui/Divider';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/auth/PasswordInput';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { UsernameField } from '../components/auth/UsernameField';
import { Button } from '../components/ui/Button';
import { signupSchema, type SignupSchema } from '../lib/validation/authSchemas';
import apiClient from '../lib/api';
import { showError, showSuccess, showWarning } from '../lib/popup';

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

export default function SignupPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const payload = {
        name: values.fullName,
        username: values.username,
        gmail: values.email,
        password: values.password,
      };

      await apiClient.post('/auth/signup', payload);
      showSuccess('OTP sent to email. Verify to complete signup.');
      navigate('/verify-otp', { state: { gmail: values.email } });
    } catch (error) {
      showError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (cred: CredentialResponse) => {
    try {
      const response = await apiClient.post('/auth/google', { idToken: cred.credential });

      if (response.data.token) {
        localStorage.setItem('readify_token', response.data.token);
        showSuccess('Logged in successfully.');
        navigate('questions');
        return;
      }

      if (response.data.needsUsername) {
        showWarning('Complete your Google signup by choosing a username.');
        navigate('/signup/complete-profile', {
          state: {
            pendingToken: response.data.pendingToken,
            name: response.data.name,
            email: response.data.gmail,
          },
        });
      }
    } catch (error) {
      showError(extractErrorMessage(error));
    }
  };

  const handleGoogleError = () => {
    const message = 'Unable to connect to the server. Please check your connection and try again.';
    showError(message);
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text">Create your account</h2>
        <p className="mt-1.5 text-sm text-textSecondary">Start your personalized reading journey.</p>
      </div>

      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        useOneTap
      />

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
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
