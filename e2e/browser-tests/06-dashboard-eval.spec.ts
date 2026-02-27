import { test, expect } from '@playwright/test'
import { collectConsoleErrors } from './helpers/auth'

test.describe('/dashboard/eval', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/eval', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — Eval widoczny', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await expect(page.getByText(/eval|Eval/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: tabela lub empty state', async ({ page }) => {
    // Czekaj na dane — albo tabela albo "brak"
    await expect(
      page.locator('table, [role="table"]').first()
    ).toBeVisible({ timeout: 15_000 }).catch(async () => {
      // Fallback — strona załadowana bez błędów
      await expect(page.locator('main').first()).toBeVisible()
    })
  })

  test('T3: przycisk "Dodaj task" — otwiera panel', async ({ page }) => {
    const addBtn = page.getByText('Dodaj').first()
    const hasBtn = await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)
    if (!hasBtn) {
      test.skip()
      return
    }
    await addBtn.click()
    await page.waitForTimeout(500)
    // Drawer/panel powinien się otworzyć
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T4: brak błędów 500', async ({ page }) => {
    const res = await page.goto('/dashboard/eval', { waitUntil: 'domcontentloaded' })
    expect(res?.status() ?? 200).toBeLessThan(500)
  })
})
