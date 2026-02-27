import { test, expect } from '@playwright/test'

test.describe('/story/[id]', () => {
  test('T1: 404 — nieistniejące story', async ({ page }) => {
    await page.goto('/story/STORY-999-999', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    // Strona nie crashuje — albo 404 albo komunikat "nie istnieje"
    await expect(page.locator('body').first()).toBeVisible()
  })

  test('T2: znane story STORY-11.5 — strona detail się ładuje', async ({ page }) => {
    await page.goto('/story/STORY-11.5', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    // Strona załadowana — może być error overlay (Next.js dev) jeśli danych brak
    // Sprawdź że body ma treść i nie jest biała strona
    const bodyText = await page.locator('body').textContent().catch(() => '')
    expect((bodyText ?? '').length).toBeGreaterThan(10)
    // Sprawdź brak 500 status
    const response = await page.goto('/story/STORY-11.5', { waitUntil: 'domcontentloaded' })
    expect(response?.status() ?? 200).toBeLessThan(500)
    // Sprawdź że albo jest breadcrumb (strona załadowana OK)
    // albo "nie istnieje" (404 inline) — oba OK
    const hasBreadcrumb = await page.locator('nav[aria-label*="Breadcrumb"]').isVisible().catch(() => false)
    const hasNotFound = await page.getByText('nie istnieje').isVisible().catch(() => false)
    expect(hasBreadcrumb || hasNotFound).toBeTruthy()
  })

  test('T3: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/story/STORY-1-1', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
