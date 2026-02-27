/**
 * Global auth setup — loguje się raz i zapisuje stan sesji.
 * Używany przez playwright.browser-tests.config.ts jako globalSetup.
 */
import { chromium } from '@playwright/test'
import path from 'path'

export const STORAGE_STATE = path.join(__dirname, '../.auth/admin.json')

async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"], input[name="email"]').fill('admin@kira.local')
  await page.locator('input[type="password"]').fill('Kira2026!')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 })

  // Zapisz cookies/localStorage
  await page.context().storageState({ path: STORAGE_STATE })
  await browser.close()
}

export default globalSetup
