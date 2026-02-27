import { test, expect } from '@playwright/test'

test.describe('/settings/users', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/users', { waitUntil: 'domcontentloaded' })
    // Poczekaj na dane
    await expect(page.getByText('admin@kira.local')).toBeVisible({ timeout: 15_000 })
  })

  test('T1: strona ładuje się — heading h1 "Użytkownicy" widoczny', async ({ page }) => {
    // Użyj heading zamiast getByText (unikamy konfliktu z linkiem w nav)
    await expect(page.locator('h1:has-text("Użytkownicy")')).toBeVisible({ timeout: 10_000 })
  })

  test('T2: email admina widoczny w tabeli', async ({ page }) => {
    await expect(page.getByText('admin@kira.local')).toBeVisible()
  })

  test('T3: przycisk "+ Zaproś" — otwiera dialog', async ({ page }) => {
    await page.getByRole('button', { name: '+ Zaproś' }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })
  })

  test('T4: dialog InviteModal — anulowanie zamyka', async ({ page }) => {
    await page.getByRole('button', { name: '+ Zaproś' }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Anuluj' }).click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 })
  })

  test('T5: sub-nav System — link nawiguje do /settings/system', async ({ page }) => {
    // Użyj linku z subnav (navigation "Ustawienia nawigacja"), nie z sidebar
    const systemLink = page.locator('nav[aria-label="Ustawienia nawigacja"] a[href="/settings/system"]')
    await expect(systemLink).toBeVisible({ timeout: 5_000 })
    await systemLink.click()
    await page.waitForURL('**/settings/system', { timeout: 10_000 })
    expect(page.url()).toContain('/settings/system')
  })
})
