/**
 * Advanced Query Cache Management
 * 
 * Implements intelligent caching strategies for high-concurrency scenarios.
 * Handles request deduplication, cache invalidation, and stale-while-revalidate patterns.
 */

import { QueryClient } from '@tanstack/react-query';

interface CacheConfig {
  key: string[];
  staleTime: number; // Time in ms before cache is considered stale
  gcTime: number; // Time in ms before cache entry is garbage collected
  ttl?: number; // Optional: Custom TTL for specific queries
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
  requestsInFlight: number;
}

class QueryCacheManager {
  private localCache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<unknown>>();
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup of expired cache entries
   */
  private startPeriodicCleanup(): void {
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.cleanupExpiredEntries();
      }, 5 * 60 * 1000); // Run every 5 minutes
    }
  }

  /**
   * Get cache key as string
   */
  private getCacheKeyString(key: string[]): string {
    return JSON.stringify(key);
  }

  /**
   * Execute a query with automatic caching and deduplication
   * Prevents duplicate in-flight requests
   */
  async executeWithCache<T>(
    config: CacheConfig,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const cacheKeyStr = this.getCacheKeyString(config.key);

    // Check if we have a valid cached result
    const cachedEntry = this.localCache.get(cacheKeyStr);
    if (cachedEntry && !this.isExpired(cachedEntry)) {
      return cachedEntry.data as T;
    }

    // Check if there's already an in-flight request (request deduplication)
    if (this.inFlightRequests.has(cacheKeyStr)) {
      try {
        return (await this.inFlightRequests.get(cacheKeyStr)) as T;
      } catch {
        // If in-flight request fails, allow retry
        this.inFlightRequests.delete(cacheKeyStr);
      }
    }

    // Execute the query
    const promise = queryFn();
    this.inFlightRequests.set(cacheKeyStr, promise);

    try {
      const data = await promise;

      // Store in local cache
      const now = Date.now();
      this.localCache.set(cacheKeyStr, {
        data,
        timestamp: now,
        expiresAt: now + (config.ttl || config.gcTime),
        requestsInFlight: 0,
      });

      // Also update React Query cache
      this.queryClient.setQueryData(config.key, data);

      return data;
    } finally {
      this.inFlightRequests.delete(cacheKeyStr);
    }
  }

  /**
   * Pre-populate cache with initial data
   */
  prefetchQuery<T>(config: CacheConfig, data: T): void {
    const cacheKeyStr = this.getCacheKeyString(config.key);
    const now = Date.now();

    this.localCache.set(cacheKeyStr, {
      data,
      timestamp: now,
      expiresAt: now + (config.ttl || config.gcTime),
      requestsInFlight: 0,
    });

    this.queryClient.setQueryData(config.key, data);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Invalidate cache for a specific query key
   */
  invalidateQuery(key: string[]): void {
    const cacheKeyStr = this.getCacheKeyString(key);
    this.localCache.delete(cacheKeyStr);
    this.queryClient.invalidateQueries({ queryKey: key });
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidateQueries(predicate: (key: string[]) => boolean): void {
    const keysToDelete: string[] = [];

    for (const [keyStr] of this.localCache) {
      const key = JSON.parse(keyStr);
      if (predicate(key)) {
        keysToDelete.push(keyStr);
      }
    }

    keysToDelete.forEach((key) => this.localCache.delete(key));
    this.queryClient.removeQueries({});
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.localCache) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.localCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cachedEntries: this.localCache.size,
      inFlightRequests: this.inFlightRequests.size,
      cacheSize: this.estimateCacheSize(),
    };
  }

  /**
   * Estimate cache size in bytes
   */
  private estimateCacheSize(): number {
    let size = 0;
    for (const [, entry] of this.localCache) {
      size += JSON.stringify(entry.data).length;
    }
    return size;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.localCache.clear();
    this.queryClient.clear();
  }
}

let cacheManager: QueryCacheManager | null = null;

/**
 * Initialize or get the cache manager
 */
export function initializeCacheManager(queryClient: QueryClient): QueryCacheManager {
  if (!cacheManager) {
    cacheManager = new QueryCacheManager(queryClient);
  }
  return cacheManager;
}

/**
 * Get the cache manager instance
 */
export function getCacheManager(): QueryCacheManager {
  if (!cacheManager) {
    throw new Error('CacheManager not initialized. Call initializeCacheManager first.');
  }
  return cacheManager;
}

/**
 * React Hook for using the cache manager in components
 * Usage:
 *   const cacheManager = useCacheManager();
 *   const data = await cacheManager.executeWithCache({ key: ['users'], staleTime: 60000, gcTime: 300000 }, fetchUsers);
 */
export function useCacheManager(): QueryCacheManager {
  if (!cacheManager) {
    throw new Error('CacheManager not initialized');
  }
  return cacheManager;
}
