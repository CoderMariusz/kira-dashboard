import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

export const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json')

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill('admin@kira.local')
  await page.locator('input[type="password"]').fill('Kira2026!')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 })
  // Stabilizacja cookies
  await page.waitForTimeout(2000)

  await context.storageState({ path: AUTH_FILE })
  await browser.close()
}

export default globalSetup
