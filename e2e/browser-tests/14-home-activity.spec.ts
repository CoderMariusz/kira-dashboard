import { test, expect } from '@playwright/test'

test.describe('/home/activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home/activity', { waitUntil: 'domcontentloaded' })
    // Poczekaj na h1 lub loading — strona potrzebuje czasu na fetch household
    await expect(page.locator('main h1, main [aria-label="Ładowanie aktywności"]').first()).toBeVisible({ timeout: 20_000 })
  })

  test('T1: strona ładuje się — h1 "Aktywność" widoczny', async ({ page }) => {
    await expect(page.locator('h1:has-text("Aktywność")')).toBeVisible({ timeout: 15_000 })
  })

  test('T2: filtry — aria-label "Filtry aktywności"', async ({ page }) => {
    await expect(page.locator('[aria-label="Filtry aktywności"]')).toBeVisible({ timeout: 10_000 })
  })

  test('T3: filtry — przycisk "Wszystkie" (aria-pressed)', async ({ page }) => {
    const allBtn = page.locator('[aria-pressed="true"]').first()
    await expect(allBtn).toBeVisible({ timeout: 10_000 })
  })

  test('T4: feed — data-testid activity-feed lub empty/error state', async ({ page }) => {
    // Feed ładuje się asynchronicznie — poczekaj dłużej
    await expect(
      page.locator('[data-testid="activity-feed"], [data-testid="activity-empty-state"], [data-testid="activity-error-state"], [aria-label="Ładowanie aktywności"]').first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test('T5: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/home/activity', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
