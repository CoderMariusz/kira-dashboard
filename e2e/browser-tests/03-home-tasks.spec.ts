import { test, expect } from '@playwright/test'

test.describe('/home/tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home/tasks', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
  })

  test('T1: strona ładuje się — board widoczny', async ({ page }) => {
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 })
  })

  test('T2: FilterBar — toolbar "Filtry zadań" widoczny', async ({ page }) => {
    await expect(page.locator('[role="toolbar"][aria-label="Filtry zadań"]')).toBeVisible({ timeout: 15_000 })
  })

  test('T3: FilterBar — przycisk "Wszystkie" zaznaczony', async ({ page }) => {
    const btn = page.locator('[aria-label="Filtry zadań"] button[aria-pressed="true"]').first()
    await expect(btn).toBeVisible({ timeout: 15_000 })
    await expect(btn).toHaveText('Wszystkie')
  })

  test('T4: kolumny kanban — "Do zrobienia" widoczna', async ({ page }) => {
    await expect(page.locator('[aria-label*="Kolumna: Do zrobienia"]')).toBeVisible({ timeout: 15_000 })
  })

  test('T5: przycisk "Dodaj zadanie" widoczny', async ({ page }) => {
    const addBtn = page.locator('[aria-label="Dodaj zadanie"]').first()
    await expect(addBtn).toBeVisible({ timeout: 15_000 })
  })
})
