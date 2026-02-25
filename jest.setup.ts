import '@testing-library/jest-dom';

// Load .env.test so that NEXT_PUBLIC_* vars are available in Jest
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.test') });

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

// ─── Response body fix for Next.js NextResponse in Jest/jsdom ────────────────
// NextResponse.json() uses Node's native fetch Response (ReadableStream body)
// which whatwg-fetch/jsdom can't consume via .text() or .json().
//
// We patch Response.prototype.text to try arrayBuffer() if the native text()
// fails (returns empty), ensuring correct behaviour for NextResponse bodies.

if (typeof Response !== 'undefined') {
  // Ensure static Response.json exists (older envs may lack it)
  if (!('json' in Response)) {
    Object.defineProperty(Response, 'json', {
      value: (data: unknown, init?: ResponseInit): Response => {
        const bodyStr = JSON.stringify(data)
        return new Response(bodyStr, {
          ...init,
          headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        })
      },
      writable: true,
      configurable: true,
    })
  }
}

// Patch NextResponse.json in next/server to return a NextResponse with a plain
// string body (avoids the ReadableStream problem in jsdom test environment).
// We do this by monkey-patching after next/server is first require()d.
const _nextServerModule = jest.requireActual<typeof import('next/server')>('next/server')
const _OriginalNextResponse = _nextServerModule.NextResponse

// Patch the static json method to use a plain string body
const _origStaticJson = _OriginalNextResponse.json.bind(_OriginalNextResponse)
Object.defineProperty(_OriginalNextResponse, 'json', {
  value: function patchedNextResponseJson(data: unknown, init?: ResponseInit): unknown {
    const bodyStr = JSON.stringify(data)
    // Call the constructor directly with a string body for test compatibility
    return new _OriginalNextResponse(bodyStr, {
      ...(init ?? {}),
      headers: {
        'content-type': 'application/json',
        ...((init?.headers instanceof Headers)
          ? Object.fromEntries((init.headers as Headers).entries())
          : (init?.headers ?? {})),
      },
    })
  },
  writable: true,
  configurable: true,
})

// Keep a reference to the original for fallback (unused but prevents tree-shake)
void _origStaticJson

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
