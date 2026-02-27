import { test, expect } from '@playwright/test'
import { collectConsoleErrors } from './helpers/auth'

test.describe('/home', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' })
  })

  test('T1: strona ładuje się — brak błędów 500', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const res = await page.goto('/home', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
    await expect(page.locator('main, body').first()).toBeVisible({ timeout: 10_000 })
    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0)
  })

  test('T2: QuickAction — link /home/shopping', async ({ page }) => {
    const link = page.locator('a[href="/home/shopping"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await page.waitForURL('**/home/shopping', { timeout: 10_000 })
    expect(page.url()).toContain('/home/shopping')
  })

  test('T3: QuickAction — link /home/tasks', async ({ page }) => {
    await page.goto('/home')
    const link = page.locator('a[href="/home/tasks"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await page.waitForURL('**/home/tasks', { timeout: 10_000 })
    expect(page.url()).toContain('/home/tasks')
  })

  test('T4: sidebar — nawigacja Home widoczna', async ({ page }) => {
    await expect(page.locator('nav, aside').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('a[href="/home/shopping"]').first()).toBeVisible()
    await expect(page.locator('a[href="/home/tasks"]').first()).toBeVisible()
  })
})
