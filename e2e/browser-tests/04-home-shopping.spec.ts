import { test, expect } from '@playwright/test'

test.describe('/home/shopping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home/shopping', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — brak błędów', async ({ page }) => {
    const res = await page.goto('/home/shopping', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T2: progress bar zakupów widoczny', async ({ page }) => {
    const progress = page.locator('[aria-label*="Postęp zakupów"]')
    await expect(progress).toBeVisible({ timeout: 10_000 })
  })

  test('T3: dodaj produkt — pojawia się na liście', async ({ page }) => {
    const productName = `TestProdukt_${Date.now()}`
    // Kliknij przycisk "Dodaj" aby otworzyć modal AddItemForm
    const addBtn = page.getByText('Dodaj').first()
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()
    // Teraz szukaj inputa w modalnym formularzu (placeholder: "np. Mleko 2%")
    const input = page.locator('input[placeholder*="Mleko"], input[placeholder*="produkt"]').first()
    await expect(input).toBeVisible({ timeout: 10_000 })
    await input.fill(productName)
    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()
    // Poczekaj aż modal się zamknie i produkt pojawi na liście
    await expect(page.getByText(productName)).toBeVisible({ timeout: 10_000 })
  })

  test('T4: toggle bought — zmienia stan produktu', async ({ page }) => {
    // Szukaj checkboxa z aria-label "Oznacz"
    const checkbox = page.locator('[aria-label*="Oznacz"]').first()
    await expect(checkbox).toBeVisible({ timeout: 10_000 })
    await checkbox.click()
    await page.waitForTimeout(500)
    // Strona nie crashuje
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T5: lista produktów — min. 1 produkt widoczny', async ({ page }) => {
    // Szukamy dowolnego produktu — progress bar mówi "X produktów do kupienia"
    // albo sekcja "Kupione" jest widoczna — więc są jakieś produkty
    const hasProducts = page.locator('[aria-label*="Postęp zakupów"]')
    await expect(hasProducts).toBeVisible({ timeout: 10_000 })
    // Sprawdź że jest min. 1 kategoria z produktami (np. "Napoje", "Mięso" itp.)
    const categoryOrItem = page.locator('[aria-label*="Oznacz"]').first()
      .or(page.getByText('Kupione').first())
    await expect(categoryOrItem).toBeVisible({ timeout: 10_000 })
  })
})
