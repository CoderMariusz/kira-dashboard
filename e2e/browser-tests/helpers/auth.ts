import { Page } from '@playwright/test'

export const TEST_EMAIL = 'admin@kira.local'
export const TEST_PASSWORD = 'Kira2026!'

/**
 * Loguje się jako admin (używaj tylko gdy storageState nie działa)
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 })
}

/**
 * Zbiera błędy JS z konsoli przeglądarki
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}
