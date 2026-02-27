import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

export const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json')

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'

  const browser = await chromium.launch()
  const context = await browser.newContext()

  // Polyfill navigator.locks — Supabase JS uses it for token refresh sync.
  // In headless Chromium this can timeout (10s) and block auth state loading.
  await context.addInitScript(() => {
    if (typeof navigator !== 'undefined' && !navigator.locks) {
      (navigator as unknown as Record<string, unknown>).locks = {
        request: (_name: string, _options: unknown, callback: () => unknown) => {
          const fn = typeof _options === 'function' ? _options : callback
          return Promise.resolve(fn())
        },
        query: () => Promise.resolve({ held: [], pending: [] }),
      }
    }
  })

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
