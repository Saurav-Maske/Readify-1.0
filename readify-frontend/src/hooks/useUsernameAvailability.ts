import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/api';

export type UsernameCheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

interface UseUsernameAvailabilityResult {
  status: UsernameCheckStatus;
  suggestions: string[];
}

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 3;

export function useUsernameAvailability(username: string): UseUsernameAvailabilityResult {
  const [status, setStatus] = useState<UsernameCheckStatus>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = username.trim();

    if (trimmed.length < MIN_LENGTH) {
      setStatus('idle');
      setSuggestions([]);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setStatus('checking');

    const timeoutId = window.setTimeout(() => {
      apiClient
        .get('/auth/check-username', {
          params: { username: trimmed },
        })
        .then((response) => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }

          if (response.data.available) {
            setStatus('available');
            setSuggestions([]);
          } else {
            setStatus('taken');
            setSuggestions([]);
          }
        })
        .catch(() => {
          if (requestIdRef.current === currentRequestId) {
            setStatus('error');
            setSuggestions([]);
          }
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [username]);

  return { status, suggestions };
}
