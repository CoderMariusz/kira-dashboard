/**
 * home.spec.ts — Test strony /home
 * Auth via Supabase cookie injection
 */
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import * as fs from 'fs'

const BASE_URL = 'http://localhost:3000'

interface TokenData {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  user: Record<string, unknown>
  [key: string]: unknown
}

// Helper: login via UI with proper waits
async function loginViaUI(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15_000 })

  // Wait for form inputs to appear (CSR hydration)
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 })

  await page.fill('input[type="email"]', 'admin@kira.local')
  await page.fill('input[type="password"]', 'Kira2026!')
  await page.click('button[type="submit"]')

  // Wait for navigation away from /login
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20_000 })
}

// Alternative: inject session cookie directly
async function injectSessionCookie(page: Page) {
  const tokenData: TokenData = JSON.parse(fs.readFileSync('/tmp/supabase-tokens.json', 'utf8'))

  const session = JSON.stringify({
    access_token: tokenData.access_token,
    token_type: 'bearer',
    expires_in: tokenData.expires_in,
    expires_at: tokenData.expires_at || Math.floor(Date.now() / 1000) + tokenData.expires_in,
    refresh_token: tokenData.refresh_token,
    user: tokenData.user,
  })

  // Set cookies on localhost domain before navigating
  await page.context().addCookies([
    {
      name: 'sb-cavihzxpsltcwlueohsc-auth-token',
      value: session,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }
  ])
}

// Combined auth: try cookie injection, fallback to UI login
async function authenticate(page: Page) {
  // First try cookie injection
  try {
    await injectSessionCookie(page)
    await page.goto(`${BASE_URL}/home`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForTimeout(2000)

    if (!page.url().includes('/login')) {
      return // success
    }
  } catch {
    // Cookie injection failed
  }

  // Fallback: UI login
  await loginViaUI(page)
  await page.goto(`${BASE_URL}/home`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await page.waitForTimeout(2000)
}

const allResults: Record<string, unknown> = {}

test.describe('/home — testy funkcjonalne', () => {
  let jsErrors: string[] = []

  test.beforeEach(async ({ page }) => {
    jsErrors = []
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') jsErrors.push(msg.text())
    })
  })

  test('Test 1: Strona /home ładuje się i pokazuje główne elementy', async ({ page }) => {
    await authenticate(page)

    // Wait for main content
    const mainEl = page.locator('main[aria-label="Strona główna household"]')
    await mainEl.waitFor({ timeout: 10_000 }).catch(() => null)
    await page.waitForTimeout(3000)

    await page.screenshot({ path: '/tmp/home-test1.png', fullPage: true })

    const mainVisible = await mainEl.isVisible().catch(() => false)
    const greetingVisible = await page.locator('text=/Cześć|Dzień dobry|Dobry wieczór|Dobry|admin/i').first().isVisible().catch(() => false)
    const shoppingLinkCount = await page.locator('a[href*="/home/shopping"]').count()
    const tasksLinkCount = await page.locator('a[href*="/home/tasks"]').count()
    const quickActionsVisible = shoppingLinkCount > 0 && tasksLinkCount > 0
    const shoppingHeaderVisible = await page.locator('text=/Zakupy|Lista zakupów|Do kupienia|Shopping/i').first().isVisible().catch(() => false)
    const activityHeaderVisible = await page.locator('text=/Aktywność|Activity|Ostatnia|Zdarzenia/i').first().isVisible().catch(() => false)
    const gridItems = await page.locator('main .grid > *').count().catch(() => 0)
    const bodyText = await page.locator('body').innerText().catch(() => '')

    const elementsFound: string[] = []
    if (greetingVisible) elementsFound.push('GreetingBanner')
    if (quickActionsVisible) elementsFound.push(`QuickActions(shopping:${shoppingLinkCount},tasks:${tasksLinkCount})`)
    if (shoppingHeaderVisible) elementsFound.push('MiniShoppingList')
    if (activityHeaderVisible) elementsFound.push('RecentActivity')
    if (mainVisible) elementsFound.push('main[aria-label]')
    if (gridItems >= 4) elementsFound.push(`StatCards(grid:${gridItems})`)

    const criticalErrors = jsErrors.filter(
      e => !e.includes('favicon') && !e.includes('net::ERR_') && !e.includes('Warning:') &&
           !e.toLowerCase().includes('hydration') && !e.includes('Failed to load resource') &&
           !e.includes('404')
    )

    allResults.test1 = {
      status: mainVisible ? 'PASS' : 'FAIL',
      currentUrl: page.url(),
      mainVisible, greetingVisible, quickActionsVisible,
      shoppingHeaderVisible, activityHeaderVisible, gridItems,
      elementsFound, criticalErrors,
      bodyTextPreview: bodyText.substring(0, 400),
    }
    fs.writeFileSync('/tmp/home-test-results.json', JSON.stringify(allResults, null, 2))
  })

  test('Test 2: MiniShoppingList — toggle produktu', async ({ page }) => {
    await authenticate(page)

    const mainEl = page.locator('main[aria-label="Strona główna household"]')
    await mainEl.waitFor({ timeout: 10_000 }).catch(() => null)
    await page.waitForTimeout(4000)

    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()
    let toggleResult = 'lista pusta'
    let stateChanged = false

    if (checkboxCount > 0) {
      const firstCb = checkboxes.first()
      const before = await firstCb.isChecked()
      await firstCb.click()
      await page.waitForTimeout(1000)
      const after = await firstCb.isChecked()
      stateChanged = before !== after
      toggleResult = stateChanged ? 'zmienił stan ✓' : 'stan NIE zmienił się ✗'
    } else {
      const listItems = await page.locator('li').count()
      toggleResult = `checkboxes: 0, li: ${listItems}`
    }

    await page.screenshot({ path: '/tmp/home-test2.png', fullPage: false })

    allResults.test2 = { status: checkboxCount > 0 ? (stateChanged ? 'PASS' : 'FAIL') : 'SKIP', checkboxCount, toggleResult, stateChanged }
    fs.writeFileSync('/tmp/home-test-results.json', JSON.stringify(allResults, null, 2))
  })

  test('Test 3: QuickActions — linki nawigacji', async ({ page }) => {
    await authenticate(page)

    const mainEl = page.locator('main[aria-label="Strona główna household"]')
    await mainEl.waitFor({ timeout: 10_000 }).catch(() => null)
    await page.waitForTimeout(2000)

    const test3: Record<string, unknown> = {}

    // Test /home/shopping
    const shopLink = page.locator('a[href*="/home/shopping"]').first()
    if (await shopLink.isVisible().catch(() => false)) {
      await shopLink.click()
      await page.waitForTimeout(3000)
      test3.shoppingUrl = page.url()
      test3.shoppingOk = page.url().includes('/home/shopping')
    } else {
      test3.shoppingOk = false
      test3.shoppingUrl = 'link nie znaleziony'
    }

    // Go back to /home
    await page.goto(`${BASE_URL}/home`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForTimeout(3000)

    // Test /home/tasks
    const taskLink = page.locator('a[href*="/home/tasks"]').first()
    if (await taskLink.isVisible().catch(() => false)) {
      await taskLink.click()
      await page.waitForTimeout(3000)
      test3.tasksUrl = page.url()
      test3.tasksOk = page.url().includes('/home/tasks')
    } else {
      test3.tasksOk = false
      test3.tasksUrl = 'link nie znaleziony'
    }

    await page.screenshot({ path: '/tmp/home-test3.png', fullPage: false })

    test3.status = (test3.shoppingOk && test3.tasksOk) ? 'PASS' : 'FAIL'
    allResults.test3 = test3
    fs.writeFileSync('/tmp/home-test-results.json', JSON.stringify(allResults, null, 2))
  })

  test('Test 4: StatCards — dane się wczytują', async ({ page }) => {
    await authenticate(page)

    const mainEl = page.locator('main[aria-label="Strona główna household"]')
    await mainEl.waitFor({ timeout: 10_000 }).catch(() => null)

    // Wait for data loading
    try {
      await page.waitForFunction(
        () => {
          const pulses = document.querySelectorAll('[class*="animate-pulse"]')
          return pulses.length === 0
        },
        { timeout: 8000 }
      )
    } catch { /* OK */ }

    await page.waitForTimeout(2000)

    const skeletonCount = await page.locator('[class*="animate-pulse"]').count()
    const mainText = await page.locator('main').innerText().catch(() => '')
    const hasNumbers = /\d+/.test(mainText)

    await page.screenshot({ path: '/tmp/home-test4.png', fullPage: true })

    allResults.test4 = {
      status: (skeletonCount === 0 && hasNumbers) ? 'PASS' : 'FAIL',
      skeletonCount, hasNumbers,
      mainTextPreview: mainText.substring(0, 600),
    }
    fs.writeFileSync('/tmp/home-test-results.json', JSON.stringify(allResults, null, 2))
  })
})
