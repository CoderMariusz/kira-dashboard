import { test, expect } from '@playwright/test'

test.describe('/dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
  })

  test('T1: strona ładuje się — sidebar widoczny', async ({ page }) => {
    await expect(page.locator('nav, aside').first()).toBeVisible({ timeout: 10_000 })
  })

  test('T2: tab switching — Pipeline', async ({ page }) => {
    await page.getByText('Pipeline').first().click()
    await page.waitForTimeout(1000)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T3: tab switching — Eval', async ({ page }) => {
    const evalBtn = page.locator('button:has-text("Eval")').first()
    await expect(evalBtn).toBeVisible({ timeout: 5_000 })
    await evalBtn.click()
    await page.waitForTimeout(1000)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T4: tab switching — NightClaw', async ({ page }) => {
    const ncBtn = page.locator('button:has-text("NightClaw")').first()
    await expect(ncBtn).toBeVisible({ timeout: 5_000 })
    await ncBtn.click()
    await page.waitForTimeout(1000)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T5: sidebar — link /home', async ({ page }) => {
    const homeLink = page.locator('a[href="/home"]').first()
    await expect(homeLink).toBeVisible({ timeout: 10_000 })
    await homeLink.click()
    await page.waitForURL('**/home**', { timeout: 10_000 })
  })
})
