import { test, expect } from '@playwright/test'

test.describe('/dashboard/nightclaw', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/nightclaw', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — NightClaw widoczny', async ({ page }) => {
    await expect(page.getByText(/nightclaw/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: zakładki widoczne', async ({ page }) => {
    const tabBar = page.locator('nav[aria-label*="Nawigacja"], [role="tablist"]').first()
    const hasTabs = await tabBar.isVisible({ timeout: 5_000 }).catch(() => false)
    if (hasTabs) {
      await expect(tabBar).toBeVisible()
    } else {
      // Sprawdź przyciski tabów bezpośrednio
      await expect(page.getByText('Overview').first()).toBeVisible({ timeout: 10_000 })
    }
  })

  test('T3: tab Digest', async ({ page }) => {
    await page.goto('/dashboard/nightclaw?tab=digest', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T4: tab Stats', async ({ page }) => {
    await page.goto('/dashboard/nightclaw?tab=stats', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T5: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/dashboard/nightclaw', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
