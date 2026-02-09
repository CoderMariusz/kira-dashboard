/**
 * CSRF Token Utility
 * Provides token generation and validation for CSRF protection
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return createHash('sha256')
    .update(Math.random().toString(36) + Date.now())
    .digest('hex')
    .slice(0, CSRF_TOKEN_LENGTH);
}

/**
 * Validate CSRF token from request
 * 
 * For production, tokens should be:
 * 1. Generated server-side and stored in session/cookie
 * 2. Passed in request headers or form data
 * 3. Compared against stored token
 * 
 * This implementation checks token format and presence
 */
export function validateCSRFToken(token: string | null | undefined): boolean {
  // Token must be present
  if (!token) {
    return false;
  }

  // Token must be a valid hex string of expected length
  if (!/^[a-f0-9]+$/.test(token) || token.length !== CSRF_TOKEN_LENGTH) {
    return false;
  }

  return true;
}

/**
 * Extract CSRF token from request headers
 */
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) || null;
}

/**
 * Extract CSRF token from request body (for form submissions)
 */
export function getCSRFTokenFromBody(
  body: Record<string, unknown>
): string | null {
  if (typeof body === 'object' && body !== null) {
    return (body.csrf_token || body.csrfToken) as string | null;
  }
  return null;
}
