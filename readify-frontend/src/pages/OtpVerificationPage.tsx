import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
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

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const gmail = useMemo(() => {
    const state = location.state as { gmail?: string } | null;
    return state?.gmail ?? '';
  }, [location.state]);

  if (!gmail) {
    navigate('/signup', { replace: true });
    return null;
  }

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!otp.trim()) {
      showError('Please enter the OTP sent to your email.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post('/auth/verify-otp', { gmail, otp });
      localStorage.setItem('readify_token', response.data.token);
      showSuccess('Account verified successfully.');
      navigate('/');
    } catch (error) {
      showError(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await apiClient.post('/auth/resend-otp', { gmail });
      showSuccess('A new OTP has been sent to your email.');
    } catch (error) {
      showError(extractErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text">Verify your email</h2>
        <p className="mt-1.5 text-sm text-textSecondary">
          We sent a 6-digit code to <span className="font-semibold text-primary">{gmail}</span>.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <Input
          label="OTP"
          placeholder="123456"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          autoComplete="one-time-code"
        />

        <Button type="submit" isLoading={submitting}>
          Verify OTP
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {resending ? 'Resending...' : 'Resend OTP'}
        </button>

        <Link to="/signup" className="font-semibold text-textSecondary hover:underline">
          Back to signup
        </Link>
      </div>
    </AuthLayout>
  );
}
