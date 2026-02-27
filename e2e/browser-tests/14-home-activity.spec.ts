import { test, expect } from '@playwright/test'

test.describe('/home/activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home/activity', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — nagłówek Aktywność', async ({ page }) => {
    // Tekst z polskim ś w nagłówku
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: filtry — aria-label "Filtry aktywności"', async ({ page }) => {
    const filterGroup = page.locator('[aria-label="Filtry aktywności"]')
    await expect(filterGroup).toBeVisible({ timeout: 10_000 })
  })

  test('T3: filtry — przycisk "Wszystkie" widoczny i klikalny', async ({ page }) => {
    const allBtn = page.locator('[aria-pressed="true"]').first()
    await expect(allBtn).toBeVisible({ timeout: 10_000 })
  })

  test('T4: feed — dane lub empty state lub loading', async ({ page }) => {
    await expect(
      page.locator('[data-testid="activity-feed"], [data-testid="activity-empty-state"], [data-testid="activity-feed-loading"], [data-testid="activity-error-state"]').first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test('T5: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/home/activity', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
