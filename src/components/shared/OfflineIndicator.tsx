'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    // Event listeners
    const handleOnline = () => {
      setIsOnline(true);
      setShowWarning(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowWarning(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything if online
  if (isOnline || !showWarning) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-amber-500 text-white',
        'px-4 py-3 text-center text-sm font-medium',
        'shadow-lg animate-in slide-in-from-top'
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">⚠️</span>
        <span>Brak połączenia z internetem. Niektóre funkcje mogą być niedostępne.</span>
      </div>
    </div>
  );
}
