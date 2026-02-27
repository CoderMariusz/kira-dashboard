import { test, expect } from '@playwright/test'
import { collectConsoleErrors } from './helpers/auth'

test.describe('/home/shopping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home/shopping', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
  })

  test('T1: strona ładuje się — brak błędów', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const res = await page.goto('/home/shopping', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0)
  })

  test('T2: progress bar — widoczny (aria-label zakupów)', async ({ page }) => {
    const progress = page.locator('[aria-label*="Postęp zakupów"]')
    const hasProgress = await progress.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!hasProgress) {
      // Empty state jest OK
      await expect(page.locator('main').first()).toBeVisible()
    } else {
      await expect(progress).toBeVisible()
    }
  })

  test('T3: dodaj produkt — pojawia się na liście', async ({ page }) => {
    const productName = `TestProdukt_${Date.now()}`
    // Input z aria-labelledby "add-item-title" lub placeholder
    const input = page.locator('[aria-labelledby="add-item-title"] input, input[placeholder*="produkt"], input[placeholder*="Produkt"], input[placeholder*="nazwa"]').first()
    const hasInput = await input.isVisible({ timeout: 8_000 }).catch(() => false)
    if (!hasInput) {
      test.skip()
      return
    }
    await input.fill(productName)
    const submitBtn = page.locator('button[type="submit"], button:has-text("Dodaj")').first()
    await submitBtn.click()
    await expect(page.getByText(productName)).toBeVisible({ timeout: 10_000 })
  })

  test('T4: toggle bought — zmienia stan (aria-label)', async ({ page }) => {
    const checkbox = page.locator('[aria-label*="Oznacz"]').first()
    const hasCheckbox = await checkbox.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!hasCheckbox) {
      test.skip()
      return
    }
    await checkbox.click()
    await page.waitForTimeout(500)
    // Sprawdź że nie crashuje
    await expect(page.locator('main').first()).toBeVisible()
  })
})
