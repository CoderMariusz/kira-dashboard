import { test as base } from '@playwright/test'

/**
 * Custom fixtures — polyfill navigator.locks per page.
 * Supabase JS v2 uses navigator.locks for token refresh sync.
 * In headless Chromium this can timeout (10s) blocking auth state.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Inject polyfill before any script runs on the page
    await page.addInitScript(() => {
      if (typeof navigator !== 'undefined') {
        // Polyfill locks — resolve immediately (no real locking needed in tests)
        Object.defineProperty(navigator, 'locks', {
          value: {
            request: (_name: string, optionsOrCallback: unknown, maybeCallback?: unknown) => {
              const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
              return Promise.resolve(typeof cb === 'function' ? cb() : undefined)
            },
            query: () => Promise.resolve({ held: [], pending: [] }),
          },
          writable: false,
          configurable: true,
        })
      }
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'
