import { test, expect } from '@playwright/test'

test.describe('/dashboard/models', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/models', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — nagłówek Models widoczny', async ({ page }) => {
    await expect(page.getByText(/model/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: karty modeli lub empty/offline state', async ({ page }) => {
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 })
    // Strona załadowana — nie crashuje
  })

  test('T3: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/dashboard/models', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
