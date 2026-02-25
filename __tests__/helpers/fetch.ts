/**
 * __tests__/helpers/fetch.ts
 * STORY-7.2 — mockRequest helper for Next.js App Router API route tests.
 *
 * Creates a Request-compatible object (cast to NextRequest) so route handlers
 * can be called directly in Jest without an HTTP server.
 *
 * Note: we use the global `Request` (provided by whatwg-fetch) rather than
 * `NextRequest` directly, because NextRequest's constructor conflicts with the
 * fetch polyfill in jsdom. Route handlers only use standard Request methods
 * (json(), headers, method) so this cast is safe.
 */

import { NextRequest } from 'next/server';

export interface MockRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  url?: string;
}

/**
 * Builds a NextRequest-compatible request suitable for passing directly to
 * App Router route handlers (POST, GET, etc.).
 *
 * @example
 * const req = mockRequest({ method: 'POST', body: { prd_text: '...' } });
 * const res = await POST(req);
 */
export function mockRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    body,
    headers = {},
    url = 'http://localhost/api/test',
  } = options;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  // Use the global Request (whatwg-fetch polyfill in jsdom) — NextRequest's
  // constructor clashes with the polyfill. Cast is safe: routes use json()/headers/method only.
  return new globalThis.Request(url, init) as unknown as NextRequest;
}
