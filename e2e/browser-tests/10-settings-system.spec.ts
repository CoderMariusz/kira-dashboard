import { test, expect } from '@playwright/test'

test.describe('/settings/system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/system', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — nagłówek System lub Settings widoczny', async ({ page }) => {
    await expect(page.getByText(/system|ustawienia/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: sub-nav Users link widoczny', async ({ page }) => {
    const usersLink = page.locator('a[href="/settings/users"]')
    await expect(usersLink.first()).toBeVisible({ timeout: 10_000 })
  })

  test('T3: przycisk Restart Bridge widoczny', async ({ page }) => {
    const restartBtn = page.getByText(/restart/i).first()
    await expect(restartBtn).toBeVisible({ timeout: 10_000 })
  })

  test('T4: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/settings/system', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
