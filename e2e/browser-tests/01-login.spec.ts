/**
 * Testy: /login
 * Ten plik NIE używa storageState — testuje sam proces logowania
 */
import { test, expect } from '@playwright/test'
import { collectConsoleErrors } from './helpers/auth'

// Wyłącz globalny storageState dla tego pliku — testujemy logowanie od zera
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('/login', () => {
  test('T1: strona ładuje się — wszystkie elementy widoczne', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.getByText('System Kira')).toBeVisible()
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })

  test('T2: walidacja — puste pola pokazują błędy', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('button[type="submit"]').click()
    await expect(page.getByText(/podaj adres email/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/podaj hasło/i)).toBeVisible()
  })

  test('T3: walidacja — błędny format email', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="email"], input[name="email"]').fill('niepoprawnyadres')
    await page.locator('button[type="submit"]').click()
    await expect(page.getByText(/nieprawidłowy format/i)).toBeVisible({ timeout: 5_000 })
  })

  test('T4: błędne credentials — pokazuje komunikat błędu', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="email"], input[name="email"]').fill('admin@kira.local')
    await page.locator('input[type="password"]').fill('ZleHaslo999!')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('T5: poprawne logowanie — redirect do /dashboard', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="email"], input[name="email"]').fill('admin@kira.local')
    await page.locator('input[type="password"]').fill('Kira2026!')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 })
    expect(page.url()).toContain('/dashboard')
    await expect(page.locator('nav, aside').first()).toBeVisible({ timeout: 10_000 })
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })
})
