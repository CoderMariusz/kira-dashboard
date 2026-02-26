import { test, expect } from '@playwright/test'

/**
 * Smoke test: Dashboard pipeline visibility
 * STORY-11.4 — AC-3: Dashboard loads with pipeline content
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@kira.dev'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || ''

async function loginAndGo(page: import('@playwright/test').Page, path: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
  if (path !== '/') await page.goto(path)
}

test.describe('Dashboard smoke', () => {
  test.beforeEach(() => {
    if (!TEST_PASSWORD) test.skip()
  })

  test('dashboard page loads without errors', async ({ page }) => {
    await loginAndGo(page, '/dashboard')
    await expect(page).not.toHaveURL('/login')
    await expect(page).not.toHaveURL('/403')
    await expect(
      page.locator('main, [role="main"], h1, [data-testid="dashboard"]').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('pipeline tab shows content', async ({ page }) => {
    await loginAndGo(page, '/dashboard?tab=pipeline')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    await expect(page).not.toHaveURL('/login')
    await expect(page).not.toHaveURL('/403')
    await expect(page.locator('main').first()).toBeVisible()

    // AC-3: at least one pipeline element (epic card, story card, or heading) must be visible
    const pipelineContent = page.locator(
      '[data-testid="epic-card"], [data-testid="story-card"], .epic, .story, h2, h3'
    )
    const count = await pipelineContent.count()
    expect(count, 'Expected at least one pipeline element (epic/story card or heading)').toBeGreaterThan(0)
  })
})
