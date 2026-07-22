import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import axios from 'axios';

import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/auth/PasswordInput';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { resetPasswordSchema, type ResetPasswordSchema } from '../lib/validation/authSchemas';
import apiClient from '../lib/api';
import { showError, showSuccess } from '../lib/popup';

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const message = data?.error || data?.message || data?.detail;

    if (message) {
      return message;
    }

    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      return 'Unable to connect to the server. Please check your connection and try again.';
    }
  }

  return 'Unable to connect to the server. Please check your connection and try again.';
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [gmail, setGmail] = useState('');
  const [checkingGmail, setCheckingGmail] = useState(false);
  const [gmailVerified, setGmailVerified] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    register,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const passwordValue = watch('password');

  const emailIsValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail.trim());
  }, [gmail]);

  const handleCheckEmail = async () => {
    if (!emailIsValid) {
      showError('Please enter a valid email address.');
      return;
    }

    try {
      setCheckingGmail(true);
      const response = await apiClient.get('/auth/check-gmail', { params: { gmail } });

      if (!response.data.exists) {
        showError('No account found for this email.');
        setGmailVerified(false);
        return;
      }

      setGmailVerified(true);
      showSuccess('Email verified. Set your new password and we will send the OTP.');
    } catch (error) {
      showError(extractErrorMessage(error));
      setGmailVerified(false);
    } finally {
      setCheckingGmail(false);
    }
  };

  const handleResetSubmit = async (values: ResetPasswordSchema) => {
    if (!gmailVerified || !gmail.trim()) {
      showError('Please verify your email first.');
      return;
    }

    try {
      setSubmittingReset(true);
      await apiClient.post('/auth/forgot-password', {
        gmail,
        newPassword: values.password,
      });

      showSuccess('OTP sent to email. Verify to complete password reset.');
      navigate('/verify-otp', {
        state: {
          gmail,
          flow: 'forgot-password',
          newPassword: values.password,
        },
      });
    } catch (error) {
      showError(extractErrorMessage(error));
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text">Reset your password</h2>
        <p className="mt-1.5 text-sm text-textSecondary">
          Enter your email, verify it, then set a new password and confirm the code we send you.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={gmail}
            onChange={(event) => {
              setGmail(event.target.value);
              setGmailVerified(false);
            }}
            autoComplete="email"
          />

          <Button type="button" variant="secondary" isLoading={checkingGmail} onClick={handleCheckEmail}>
            Verify email
          </Button>
        </div>

        {gmailVerified && (
          <form onSubmit={handleSubmit(handleResetSubmit)} className="space-y-5">
            <div>
              <PasswordInput
                label="New password"
                placeholder="Create a strong password"
                {...register('password')}
                error={errors.password?.message}
              />
              <PasswordStrengthMeter password={passwordValue} />
            </div>

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <PasswordInput
                  label="Confirm new password"
                  placeholder="Re-enter your new password"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button type="submit" isLoading={submittingReset}>
              Send OTP to email
            </Button>
          </form>
        )}

      </div>

      <p className="mt-8 text-center text-sm text-textSecondary">
        Remembered your password?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
