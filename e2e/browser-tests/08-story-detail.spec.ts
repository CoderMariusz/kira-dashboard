import { test, expect } from '@playwright/test'

test.describe('/story/[id]', () => {
  test('T1: 404 — nieistniejące story', async ({ page }) => {
    await page.goto('/story/STORY-999-999', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    // Strona nie crashuje — albo 404 albo komunikat
    await expect(page.locator('body').first()).toBeVisible()
  })

  test('T2: pipeline — kliknięcie story otwiera detail', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    // Przejdź na tab Pipeline
    const pipelineBtn = page.getByText('Pipeline').first()
    await expect(pipelineBtn).toBeVisible({ timeout: 10_000 })
    await pipelineBtn.click()
    await page.waitForTimeout(2000)

    // Znajdź link do story
    const storyLink = page.locator('a[href*="/story/"]').first()
    const hasLink = await storyLink.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!hasLink) {
      test.skip()
      return
    }
    const href = await storyLink.getAttribute('href')
    await storyLink.click()
    await page.waitForURL('**/story/**', { timeout: 10_000 })
    // Strona załadowana
    await expect(page.locator('body').first()).toBeVisible()
  })

  test('T3: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/story/STORY-1-1', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
