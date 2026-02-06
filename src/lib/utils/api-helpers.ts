/**
 * API Helper Utilities
 * 
 * Shared utilities for API route handlers to reduce code duplication
 * and improve consistency across endpoints.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetProfile, AuthResult } from '@/lib/utils/api-auth';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

/**
 * Standard API response handler
 */
export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Authenticated context with profile and client
 */
export interface AuthenticatedContext {
  profile: NonNullable<AuthResult['profile']>;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Error response options
 */
export interface ErrorResponseOptions {
  status?: number;
  message?: string;
  logError?: boolean;
  error?: unknown;
}

// ══════════════════════════════════════════════════════════
// ERROR RESPONSES
// ══════════════════════════════════════════════════════════

/**
 * Create a standardized error response
 */
export function errorResponse(options: ErrorResponseOptions): NextResponse {
  const {
    status = 500,
    message = 'Internal server error',
    logError = false,
    error,
  } = options;

  if (logError && error) {
    console.error('[API]', message, error);
  }

  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * 400 Bad Request
 */
export function badRequest(message: string, error?: unknown): NextResponse {
  return errorResponse({
    status: 400,
    message,
    logError: true,
    error,
  });
}

/**
 * 401 Unauthorized
 */
export function unauthorized(message: string = 'Authentication required'): NextResponse {
  return errorResponse({
    status: 401,
    message,
  });
}

/**
 * 403 Forbidden
 */
export function forbidden(message: string = 'Access denied'): NextResponse {
  return errorResponse({
    status: 403,
    message,
  });
}

/**
 * 404 Not Found
 */
export function notFound(resource: string = 'Resource'): NextResponse {
  return errorResponse({
    status: 404,
    message: `${resource} not found`,
  });
}

/**
 * 500 Internal Server Error
 */
export function serverError(error?: unknown): NextResponse {
  return errorResponse({
    status: 500,
    message: 'Internal server error',
    logError: true,
    error,
  });
}

// ══════════════════════════════════════════════════════════
// AUTHENTICATION HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Wraps a handler with authentication check
 * Returns 401 or 400 (no household) if auth fails
 */
export function withAuth(
  handler: (context: AuthenticatedContext) => Promise<NextResponse>
): ApiHandler {
  return async (request) => {
    try {
      // Authenticate
      const auth = await authenticateAndGetProfile();
      if (!auth.success) return auth.response;

      // Check household
      const { profile } = auth;
      if (!profile.household_id) {
        return badRequest('User must belong to a household');
      }

      // Create supabase client
      const supabase = await createClient();

      // Call handler with authenticated context
      return await handler({ profile, supabase });
    } catch (error) {
      return serverError(error);
    }
  };
}

// ══════════════════════════════════════════════════════════
// REQUEST BODY HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Safely parse JSON from request
 */
export async function parseRequestBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Parse JSON or return bad request response
 */
export async function requireJsonBody<T>(
  request: NextRequest
): Promise<NextResponse | T> {
  const body = await parseRequestBody<T>(request);
  
  if (body === null) {
    return badRequest('Invalid JSON payload');
  }
  
  return body;
}

// ══════════════════════════════════════════════════════════
// DATABASE HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Fetch single task by ID with type check
 */
export async function fetchTaskById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  type?: 'epic' | 'story'
) {
  // Supabase query builder returns NEW object on each method call
  // Must chain properly, not mutate
  let query = supabase.from('tasks').select('*').eq('id', id);
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query.single();
  
  if (error) {
    return { data: null, error };
  }
  
  return { data, error: null };
}

/**
 * Check if task belongs to user's household
 */
export function verifyTaskHouseholdAccess(
  task: { household_id?: string | null } | null,
  userHouseholdId: string
): boolean {
  if (!task) return false;
  return task.household_id === userHouseholdId;
}
