/**
 * smoke.spec.ts — STORY-7.3
 * Smoke tests for all main routes.
 * Verifies: no 500 errors, body visible, no critical console errors.
 * Auth-protected pages: just checks redirect/load (no real session needed).
 */
import { test, expect, type Page } from '@playwright/test'

// Collect non-favicon console errors
async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return errors
}

// Routes to test — derived from app/ directory structure
const publicRoutes = ['/login']

const appRoutes = [
  '/dashboard',
  '/home',
  '/home/activity',
  '/home/analytics',
  '/home/household',
  '/home/shopping',
  '/home/tasks',
  '/settings',
]

// Helper: smoke test a single page
async function smokePage(page: Page, route: string) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // No server errors (5xx)
  if (response) {
    expect(
      response.status(),
      `${route} returned HTTP ${response.status()}`
    ).not.toBeGreaterThanOrEqual(500)
  }

  // Body must be rendered
  await expect(page.locator('body')).toBeVisible()

  // No critical console errors (ignore favicon 404s and hydration warnings)
  const criticalErrors = errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_') &&        // network errors for missing assets OK in dev
      !e.includes('Warning:') &&         // React warnings are OK in smoke context
      !e.toLowerCase().includes('hydration') && // hydration mismatch OK
      !e.includes('Failed to load resource')    // API/asset 404s normal in dev
  )

  expect(
    criticalErrors,
    `${route} had critical console errors: ${criticalErrors.join(', ')}`
  ).toHaveLength(0)
}

// ── Public routes ────────────────────────────────────────────────────────────

test.describe('Public pages', () => {
  for (const route of publicRoutes) {
    test(`[smoke] ${route} — loads without 500`, async ({ page }) => {
      await smokePage(page, route)
    })
  }
})

// ── App routes (may redirect to login if session required) ───────────────────

test.describe('App pages', () => {
  for (const route of appRoutes) {
    test(`[smoke] ${route} — loads or redirects (no 500)`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })

      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })

      // Allow redirects (3xx) and success (2xx) — just not 5xx
      if (response) {
        const status = response.status()
        expect(
          status,
          `${route} returned HTTP ${status} (server error)`
        ).not.toBeGreaterThanOrEqual(500)
      }

      // Final URL after any redirects
      const finalUrl = page.url()

      // If redirected to login/auth — that's expected behavior, test passes
      const isAuthRedirect =
        finalUrl.includes('/login') || finalUrl.includes('/auth')

      if (!isAuthRedirect) {
        // Only check body & errors if we actually landed on the page
        await expect(page.locator('body')).toBeVisible()

        const criticalErrors = errors.filter(
          (e) =>
            !e.includes('favicon') &&
            !e.includes('net::ERR_') &&
            !e.includes('Warning:') &&
            !e.toLowerCase().includes('hydration') &&
            !e.includes('Failed to load resource') // API/asset 404s normal in dev
        )

        expect(
          criticalErrors,
          `${route} had critical console errors: ${criticalErrors.join(', ')}`
        ).toHaveLength(0)
      }
    })
  }
})

// ── Root redirect ─────────────────────────────────────────────────────────────

test('[smoke] / — redirects to /dashboard', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  // Root should redirect to /dashboard (or /login if auth required)
  const url = page.url()
  expect(
    url.includes('/dashboard') || url.includes('/login') || url.includes('/home'),
    `/ should redirect to /dashboard or /login, got: ${url}`
  ).toBeTruthy()
  await expect(page.locator('body')).toBeVisible()
})
