import { test, expect } from '@playwright/test'
import { collectConsoleErrors } from './helpers/auth'

test.describe('/settings/users', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/users', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — nagłówek "Użytkownicy" widoczny', async ({ page }) => {
    await expect(page.getByText('Użytkownicy')).toBeVisible({ timeout: 15_000 })
  })

  test('T2: email admina widoczny w tabeli', async ({ page }) => {
    await expect(page.getByText('admin@kira.local')).toBeVisible({ timeout: 15_000 })
  })

  test('T3: przycisk "+ Zaproś" — otwiera dialog', async ({ page }) => {
    await expect(page.getByText('admin@kira.local')).toBeVisible({ timeout: 15_000 })
    const inviteBtn = page.getByText('+ Zaproś')
    await expect(inviteBtn).toBeVisible({ timeout: 5_000 })
    await inviteBtn.click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })
  })

  test('T4: dialog — anulowanie zamyka', async ({ page }) => {
    await expect(page.getByText('admin@kira.local')).toBeVisible({ timeout: 15_000 })
    await page.getByText('+ Zaproś').click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })
    await page.locator('[role="dialog"]').getByText('Anuluj').click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 })
  })

  test('T5: sub-nav — link do /settings/system', async ({ page }) => {
    await expect(page.getByText('admin@kira.local')).toBeVisible({ timeout: 15_000 })
    const systemLink = page.locator('a[href="/settings/system"]')
    await expect(systemLink).toBeVisible()
    await systemLink.click()
    await page.waitForURL('**/settings/system', { timeout: 10_000 })
  })
})
