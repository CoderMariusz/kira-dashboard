/**
 * Supabase Connection Pool Manager
 * 
 * Implements connection pooling for high-concurrency scenarios (100+ concurrent users).
 * Reuses client instances to reduce initialization overhead and memory usage.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

const POOL_SIZE = 10; // Maximum pooled client instances
const MAX_CLIENT_AGE = 30 * 60 * 1000; // 30 minutes - maximum time before client is refreshed

interface PooledClient {
  client: ReturnType<typeof createBrowserClient>;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
}

class SupabaseConnectionPool {
  private pool: PooledClient[] = [];
  private waitQueue: ((client: ReturnType<typeof createBrowserClient>) => void)[] = [];

  constructor(
    private supabaseUrl: string,
    private supabaseAnonKey: string
  ) {
    // Pre-warm the pool with initial connections
    this.preWarmPool();
  }

  /**
   * Pre-warm the pool with initial client instances
   * Reduces latency for first requests
   */
  private preWarmPool(): void {
    const initialSize = Math.min(3, POOL_SIZE);
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createPooledClient());
    }
  }

  /**
   * Create a new pooled client instance
   */
  private createPooledClient(): PooledClient {
    return {
      client: createBrowserClient<Database>(this.supabaseUrl, this.supabaseAnonKey),
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: false,
    };
  }

  /**
   * Get a client from the pool or create a new one
   * Implements queuing for high-concurrency scenarios
   */
  async getClient(): Promise<ReturnType<typeof createBrowserClient>> {
    // Find an available client in the pool
    const availableClient = this.pool.find((pc) => !pc.inUse && !this.isClientExpired(pc));

    if (availableClient) {
      availableClient.inUse = true;
      availableClient.lastUsed = Date.now();
      return availableClient.client;
    }

    // If pool is not full, create a new client
    if (this.pool.length < POOL_SIZE) {
      const newPooledClient = this.createPooledClient();
      newPooledClient.inUse = true;
      this.pool.push(newPooledClient);
      return newPooledClient.client;
    }

    // Pool is full - wait for a client to become available
    return new Promise((resolve) => {
      this.waitQueue.push((client) => {
        resolve(client);
      });
    });
  }

  /**
   * Release a client back to the pool
   */
  releaseClient(): void {
    const inUseClient = this.pool.find((pc) => pc.inUse);
    if (inUseClient) {
      inUseClient.inUse = false;
    }

    // Process waiting requests
    if (this.waitQueue.length > 0) {
      const resolver = this.waitQueue.shift();
      const availableClient = this.pool.find((pc) => !pc.inUse);
      if (availableClient && resolver) {
        availableClient.inUse = true;
        availableClient.lastUsed = Date.now();
        resolver(availableClient.client);
      }
    }
  }

  /**
   * Check if a client has expired and needs to be refreshed
   */
  private isClientExpired(pooledClient: PooledClient): boolean {
    return Date.now() - pooledClient.createdAt > MAX_CLIENT_AGE;
  }

  /**
   * Clean up expired clients from the pool
   * Call periodically to maintain pool health
   */
  cleanup(): void {
    this.pool = this.pool.filter((pc) => !this.isClientExpired(pc));
  }

  /**
   * Get pool statistics for monitoring
   */
  getStats() {
    return {
      totalClients: this.pool.length,
      availableClients: this.pool.filter((pc) => !pc.inUse).length,
      inUseClients: this.pool.filter((pc) => pc.inUse).length,
      waitingRequests: this.waitQueue.length,
      poolSize: POOL_SIZE,
    };
  }
}

// Singleton instance for browser clients
let browserPool: SupabaseConnectionPool | null = null;

/**
 * Get or initialize the browser connection pool
 */
export function getBrowserPool(): SupabaseConnectionPool {
  if (!browserPool) {
    browserPool = new SupabaseConnectionPool(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Periodic cleanup every 5 minutes
    if (typeof window !== 'undefined') {
      setInterval(() => browserPool?.cleanup(), 5 * 60 * 1000);
    }
  }
  return browserPool;
}

/**
 * Get a client from the pool
 * Usage:
 *   const client = await getPooledClient();
 *   try {
 *     // use client
 *   } finally {
 *     releasePooledClient();
 *   }
 */
export async function getPooledClient() {
  return getBrowserPool().getClient();
}

/**
 * Release a client back to the pool
 */
export function releasePooledClient(): void {
  getBrowserPool().releaseClient();
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  return getBrowserPool().getStats();
}
