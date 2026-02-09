/**
 * Health Check API
 * GET /api/health - Returns system health status
 * 
 * Public endpoint (no authentication required) that checks:
 * - Database connectivity (Supabase)
 * - Cache status
 * - System uptime
 * - Response time
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    status: 'ok' | 'error';
    responseTime: number;
    message?: string;
  };
  cache: {
    status: 'ok' | 'unavailable';
    responseTime: number;
    message?: string;
  };
  system: {
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    uptime: number;
  };
}

// Track server start time for uptime calculation
const SERVER_START_TIME = Date.now();

// Simple in-memory cache for health checks
const healthCache = new Map<string, { lastCheck: number; healthy: boolean }>();

export async function GET(request: Request) {
  const requestStartTime = Date.now();
  
  try {
    const cookieStore = cookies();
    
    // Check database connectivity
    let dbStatus = 'ok' as const;
    let dbResponseTime = 0;
    let dbMessage: string | undefined;
    
    try {
      const dbStartTime = Date.now();
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {
                // Server component context
              }
            },
          },
        }
      );
      
      // Test database connection with a simple query
      const { error: dbError } = await supabase
        .from('tasks')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      dbResponseTime = Date.now() - dbStartTime;
      
      if (dbError) {
        dbStatus = 'error';
        dbMessage = `Database query failed: ${dbError.message}`;
      }
    } catch (error) {
      dbStatus = 'error';
      dbMessage = `Database connection error: ${error instanceof Error ? error.message : String(error)}`;
      dbResponseTime = Date.now() - requestStartTime;
    }
    
    // Check cache (simple in-memory cache status)
    let cacheStatus = 'ok' as const;
    let cacheResponseTime = 0;
    let cacheMessage: string | undefined;
    
    try {
      const cacheStartTime = Date.now();
      
      // Simulate cache check by checking if we can access the health cache map
      if (healthCache && typeof healthCache.get === 'function') {
        const testKey = '__health_check__';
        healthCache.set(testKey, { lastCheck: Date.now(), healthy: true });
        const testValue = healthCache.get(testKey);
        if (!testValue) {
          cacheStatus = 'unavailable';
          cacheMessage = 'Cache write/read failed';
        }
        healthCache.delete(testKey);
      }
      
      cacheResponseTime = Date.now() - cacheStartTime;
    } catch (error) {
      cacheStatus = 'unavailable';
      cacheMessage = `Cache error: ${error instanceof Error ? error.message : String(error)}`;
      cacheResponseTime = Date.now() - requestStartTime;
    }
    
    // Calculate system metrics
    const memoryUsage = process.memoryUsage();
    const systemUptime = process.uptime();
    const serverUptime = Date.now() - SERVER_START_TIME;
    
    // Determine overall health status
    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 
      dbStatus === 'ok' && cacheStatus === 'ok' ? 'healthy' :
      dbStatus === 'ok' ? 'degraded' :
      'unhealthy';
    
    const healthResponse: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: serverUptime,
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        ...(dbMessage && { message: dbMessage }),
      },
      cache: {
        status: cacheStatus,
        responseTime: cacheResponseTime,
        ...(cacheMessage && { message: cacheMessage }),
      },
      system: {
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        uptime: systemUptime,
      },
    };
    
    // Set appropriate HTTP status code based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : (overallStatus === 'degraded' ? 200 : 503);
    
    return NextResponse.json(healthResponse, { status: httpStatus });
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - SERVER_START_TIME,
      database: {
        status: 'error',
        responseTime: Date.now() - requestStartTime,
        message: 'Unexpected error during health check',
      },
      cache: {
        status: 'unavailable',
        responseTime: 0,
      },
      system: {
        memoryUsage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
        },
        uptime: process.uptime(),
      },
    };
    
    return NextResponse.json(errorResponse, { status: 503 });
  }
}
