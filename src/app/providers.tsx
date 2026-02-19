'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { AutoSaveProvider } from '@/components/AutoSaveProvider';
import { initializeCacheManager } from '@/lib/query-cache';

// Optimized QueryClient configuration for high-concurrency environments (100+ concurrent users)
function createOptimizedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Aggressive caching strategy to reduce redundant queries
        staleTime: 5 * 60 * 1000, // 5 minutes - cache is fresh for this duration
        gcTime: 15 * 60 * 1000, // 15 minutes - keep data in cache for garbage collection
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'stale', // Only refetch stale data on reconnect
        refetchOnMount: 'stale', // Only refetch stale data on remount
        retry: 3, // Exponential backoff retry strategy
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Deduplication - prevent duplicate requests in flight
        networkMode: 'online',
      },
      mutations: {
        // Optimized mutation settings for concurrent writes
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        networkMode: 'online',
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createOptimizedQueryClient());

  // Initialize cache manager on mount
  useEffect(() => {
    initializeCacheManager(queryClient);
  }, [queryClient]);

  return (
    <AutoSaveProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </AutoSaveProvider>
  );
}
