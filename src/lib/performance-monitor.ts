/**
 * Performance Monitoring Module
 * 
 * Monitors query performance and concurrency metrics to identify bottlenecks.
 * Tracks query latency, concurrent request counts, and cache hit rates.
 */

interface QueryMetric {
  key: string;
  duration: number;
  timestamp: number;
  success: boolean;
  cached: boolean;
}

interface PerformanceMetrics {
  totalQueries: number;
  totalDuration: number;
  averageLatency: number;
  cacheHitRate: number;
  maxConcurrentRequests: number;
  currentConcurrentRequests: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
}

class PerformanceMonitor {
  private metrics: QueryMetric[] = [];
  private currentConcurrentRequests = 0;
  private maxConcurrentRequests = 0;
  private metricsWindow = 5 * 60 * 1000; // Keep last 5 minutes of metrics

  /**
   * Track query execution
   */
  trackQuery(
    key: string,
    duration: number,
    success: boolean,
    cached: boolean
  ): void {
    const metric: QueryMetric = {
      key,
      duration,
      timestamp: Date.now(),
      success,
      cached,
    };

    this.metrics.push(metric);
    this.cleanupOldMetrics();
  }

  /**
   * Increment concurrent request counter
   */
  incrementConcurrent(): void {
    this.currentConcurrentRequests++;
    if (this.currentConcurrentRequests > this.maxConcurrentRequests) {
      this.maxConcurrentRequests = this.currentConcurrentRequests;
    }
  }

  /**
   * Decrement concurrent request counter
   */
  decrementConcurrent(): void {
    this.currentConcurrentRequests = Math.max(0, this.currentConcurrentRequests - 1);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        totalDuration: 0,
        averageLatency: 0,
        cacheHitRate: 0,
        maxConcurrentRequests: this.maxConcurrentRequests,
        currentConcurrentRequests: this.currentConcurrentRequests,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0,
      };
    }

    const successful = this.metrics.filter((m) => m.success);
    const cached = this.metrics.filter((m) => m.cached);
    const failed = this.metrics.filter((m) => !m.success);

    const durations = successful.map((m) => m.duration).sort((a, b) => a - b);

    return {
      totalQueries: this.metrics.length,
      totalDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0),
      averageLatency:
        successful.length > 0
          ? successful.reduce((sum, m) => sum + m.duration, 0) / successful.length
          : 0,
      cacheHitRate: this.metrics.length > 0 ? (cached.length / this.metrics.length) * 100 : 0,
      maxConcurrentRequests: this.maxConcurrentRequests,
      currentConcurrentRequests: this.currentConcurrentRequests,
      p95Latency: this.getPercentile(durations, 0.95),
      p99Latency: this.getPercentile(durations, 0.99),
      errorRate: this.metrics.length > 0 ? (failed.length / this.metrics.length) * 100 : 0,
    };
  }

  /**
   * Get metrics for a specific query key
   */
  getQueryMetrics(key: string) {
    const queryMetrics = this.metrics.filter((m) => m.key === key);
    if (queryMetrics.length === 0) {
      return null;
    }

    const successful = queryMetrics.filter((m) => m.success);
    const durations = successful.map((m) => m.duration).sort((a, b) => a - b);

    return {
      count: queryMetrics.length,
      successCount: successful.length,
      averageLatency:
        successful.length > 0
          ? successful.reduce((sum, m) => sum + m.duration, 0) / successful.length
          : 0,
      minLatency: durations.length > 0 ? durations[0] : 0,
      maxLatency: durations.length > 0 ? durations[durations.length - 1] : 0,
      cacheHitRate:
        queryMetrics.length > 0
          ? (queryMetrics.filter((m) => m.cached).length / queryMetrics.length) * 100
          : 0,
    };
  }

  /**
   * Get slowest queries
   */
  getSlowestQueries(count = 10) {
    return this.metrics
      .filter((m) => m.success)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map((m) => ({
        key: m.key,
        duration: m.duration,
        cached: m.cached,
      }));
  }

  /**
   * Calculate percentile of durations
   */
  private getPercentile(durations: number[], percentile: number): number {
    if (durations.length === 0) return 0;
    const index = Math.ceil(durations.length * percentile) - 1;
    return durations[Math.max(0, index)];
  }

  /**
   * Remove metrics older than the metrics window
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.metricsWindow;
    this.metrics = this.metrics.filter((m) => m.timestamp > cutoffTime);
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = [];
    this.currentConcurrentRequests = 0;
    this.maxConcurrentRequests = 0;
  }

  /**
   * Log metrics to console
   */
  logMetrics(): void {
    const metrics = this.getMetrics();
    console.log('🔍 Performance Metrics:', {
      ...metrics,
      averageLatency: `${metrics.averageLatency.toFixed(2)}ms`,
      p95Latency: `${metrics.p95Latency.toFixed(2)}ms`,
      p99Latency: `${metrics.p99Latency.toFixed(2)}ms`,
      cacheHitRate: `${metrics.cacheHitRate.toFixed(2)}%`,
      errorRate: `${metrics.errorRate.toFixed(2)}%`,
    });

    const slowest = this.getSlowestQueries(5);
    if (slowest.length > 0) {
      console.log('🐢 Slowest Queries:', slowest);
    }
  }
}

let monitor: PerformanceMonitor | null = null;

/**
 * Get or initialize the performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitor) {
    monitor = new PerformanceMonitor();

    // Log metrics periodically in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      setInterval(() => {
        monitor?.logMetrics();
      }, 30 * 1000); // Every 30 seconds
    }
  }
  return monitor;
}

/**
 * Track a query execution
 */
export function trackQueryExecution(
  key: string,
  duration: number,
  success: boolean,
  cached: boolean
): void {
  getPerformanceMonitor().trackQuery(key, duration, success, cached);
}

/**
 * Wrap an async function with performance tracking
 */
export async function withPerformanceTracking<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = performance.now();
  monitor.incrementConcurrent();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    monitor.trackQuery(key, duration, true, false);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    monitor.trackQuery(key, duration, false, false);
    throw error;
  } finally {
    monitor.decrementConcurrent();
  }
}
