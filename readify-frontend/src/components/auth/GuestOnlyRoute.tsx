import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/api';

interface GuestOnlyRouteProps {
  children: ReactNode;
}

export function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(() => {
    return Boolean(localStorage.getItem('readify_token'));
  });

  useEffect(() => {
    const token = localStorage.getItem('readify_token');
    if (!token) {
      setChecking(false);
      return;
    }

    let isCurrent = true;
    apiClient
      .get<{ onboardingComplete: boolean }>('/auth/me')
      .then((response) => {
        if (!isCurrent) return;
        const target = response.data.onboardingComplete ? '/feed' : '/questions';
        navigate(target, { replace: true });
      })
      .catch(() => {
        if (!isCurrent) return;
        // Invalid or expired token — clear it so user can log in fresh
        localStorage.removeItem('readify_token');
        setChecking(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
