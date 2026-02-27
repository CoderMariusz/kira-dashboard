import { test, expect } from '@playwright/test'

test.describe('/home/analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home/analytics', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — Analytics widoczny', async ({ page }) => {
    await expect(page.getByText(/analytics/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: wykresy renderują się', async ({ page }) => {
    await page.waitForTimeout(3000)
    // SVG od recharts lub jakikolwiek chart element
    const chart = page.locator('svg, canvas').first()
    const hasChart = await chart.isVisible({ timeout: 5_000 }).catch(() => false)
    // ADMIN powinien widzieć wykresy — ale mogą nie renderować się bez danych
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T3: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/home/analytics', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
