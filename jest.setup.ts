import '@testing-library/jest-dom';

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('whatwg-fetch');

// ─── Patch NextResponse.json ──────────────────────────────────────────────────
// NextResponse.json calls the Web API static method Response.json, which is
// absent from both jsdom and the whatwg-fetch polyfill. In production (real
// Node.js / Edge runtime) this works fine. In Jest we patch it directly.
//
// The patch creates a real ReadableStream body so that res.json() / res.text()
// work correctly in tests. ReadableStream and TextEncoder are available in
// Node 18+.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextResponse } = require('next/server') as typeof import('next/server');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(NextResponse as any).json = function (body: unknown, init?: ResponseInit): InstanceType<typeof NextResponse> {
  const text = JSON.stringify(body);
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  // Pass a plain string as body — native Node.js Response (which NextResponse
  // ultimately inherits from in prod) accepts strings and creates a proper body.
  return new NextResponse(text, { ...init, headers });
};

// ─── MSW server setup ─────────────────────────────────────────────────────────

type MockServer = {
  listen: () => void;
  resetHandlers: () => void;
  close: () => void;
};

const noop = () => {};
let server: MockServer = {
  listen: noop,
  resetHandlers: noop,
  close: noop,
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  server = require('@/__tests__/mocks/server').server as MockServer;
} catch {
  // MSW import can be unavailable in minimal smoke setup.
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
