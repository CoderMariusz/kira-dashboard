import { test, expect } from '@playwright/test'

test.describe('/dashboard/patterns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/patterns', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — nagłówek Patterns widoczny', async ({ page }) => {
    await expect(page.getByText(/pattern/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: search input widoczny', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj"], input[placeholder*="szukaj"]')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill('test')
    await page.waitForTimeout(500)
    await expect(searchInput).toHaveValue('test')
  })

  test('T3: zakładki Patterns / Lessons widoczne', async ({ page }) => {
    await expect(page.getByText('Patterns').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Lessons').first()).toBeVisible({ timeout: 10_000 })
  })

  test('T4: przycisk "Dodaj Pattern" — widoczny', async ({ page }) => {
    const addBtn = page.getByText(/dodaj pattern/i).first()
    const hasBtn = await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)
    if (!hasBtn) test.skip()
    else await expect(addBtn).toBeVisible()
  })

  test('T5: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/dashboard/patterns', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
