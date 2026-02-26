import { test, expect } from '@playwright/test'

/**
 * Smoke test: Authentication flow
 * STORY-11.4 — AC-2: Login works, redirects to dashboard/home
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@kira.dev'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || ''

test.describe('Auth smoke', () => {
  test('login page loads', async ({ page }) => {
    // Use domcontentloaded to avoid ERR_ABORTED on slow hydration
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded' })
    expect(response?.status() ?? 200).toBeLessThan(500)
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5_000 })
  })

  test('login with test credentials redirects to app', async ({ page }) => {
    if (!TEST_PASSWORD) test.skip()

    // AC-2: track console errors
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="email"], input[name="email"]').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').fill(TEST_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })

    const pathname = new URL(page.url()).pathname
    expect(['/dashboard', '/home', '/home/tasks']).toContain(pathname)

    await expect(
      page.locator('nav, aside, [data-testid="sidebar"]').first()
    ).toBeVisible({ timeout: 10_000 })

    // AC-2: no JS console errors during login flow
    expect(errors).toHaveLength(0)
  })
})
