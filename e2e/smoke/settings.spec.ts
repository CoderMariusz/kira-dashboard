import { test, expect } from '@playwright/test'

/**
 * Smoke test: Settings / users page ADMIN access
 * STORY-11.4 — AC-4: /settings/users visible for ADMIN, no redirect to /403
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@kira.dev'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || ''

async function loginAndGo(page: import('@playwright/test').Page, path: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
  await page.goto(path)
}

test.describe('Settings smoke', () => {
  test.beforeEach(() => {
    if (!TEST_PASSWORD) test.skip()
  })

  test('/settings/users loads without 403 for ADMIN account', async ({ page }) => {
    await loginAndGo(page, '/settings/users')
    await expect(page).not.toHaveURL('/403', { timeout: 8_000 })
    await expect(page).not.toHaveURL('/login')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    const pageContent = page.locator('table, [data-testid="users-table"], h1, h2')
    await expect(pageContent.first()).toBeVisible({ timeout: 10_000 })
  })
})
