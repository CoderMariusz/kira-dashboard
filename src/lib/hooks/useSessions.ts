/**
 * Hook to fetch and manage active sessions
 */

'use client';

import { useEffect, useState } from 'react';

export interface ActiveSession {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActivity: string;
  isCurrentDevice: boolean;
}

interface UseSessionsReturn {
  sessions: ActiveSession[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Unauthorized. Please log in again.');
        } else {
          setError(`Failed to fetch sessions: ${response.statusText}`);
        }
        setSessions([]);
        return;
      }

      const result = await response.json();
      setSessions(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions,
  };
}
