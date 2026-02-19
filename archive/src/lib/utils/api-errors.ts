import { NextResponse } from 'next/server';

/**
 * API error response utilities for consistent error handling.
 * 
 * Provides standardized error responses across all API routes.
 */

// ══════════════════════════════════════════════════════════
// ERROR RESPONSE HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Creates a standardized 400 Bad Request response.
 */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Creates a standardized 401 Unauthorized response.
 */
export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Creates a standardized 404 Not Found response.
 */
export function notFound(message: string, details?: string): NextResponse {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status: 404 }
  );
}

/**
 * Creates a standardized 500 Internal Server Error response.
 */
export function serverError(message: string, details?: string): NextResponse {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status: 500 }
  );
}

/**
 * Creates a standardized 200 OK response with data.
 */
export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
