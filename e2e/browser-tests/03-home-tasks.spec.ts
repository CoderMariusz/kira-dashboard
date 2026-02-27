import { test, expect } from '@playwright/test'
import { collectConsoleErrors } from './helpers/auth'

test.describe('/home/tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home/tasks', { waitUntil: 'domcontentloaded' })
    // Poczekaj na załadowanie board lub skeleton
    await page.waitForTimeout(2000)
  })

  test('T1: strona ładuje się — board lub skeleton widoczny', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await expect(
      page.locator('[aria-label="Ładowanie tablicy zadań..."], [class*="board"], [class*="column"]').first()
    ).toBeVisible({ timeout: 15_000 })
    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0)
  })

  test('T2: FilterBar — aria-label "Filtry zadań" widoczny', async ({ page }) => {
    const filterBar = page.locator('[aria-label="Filtry zadań"]')
    await expect(filterBar).toBeVisible({ timeout: 10_000 })
  })

  test('T3: QuickAddTask — przycisk dodaj zadanie widoczny', async ({ page }) => {
    const addBtn = page.locator('[aria-label="Dodaj zadanie"]').first()
    const hasBtn = await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!hasBtn) {
      // Szukaj "+" w kolumnach
      const plusBtn = page.locator('button:has-text("+")').first()
      await expect(plusBtn).toBeVisible({ timeout: 5_000 })
    } else {
      await expect(addBtn).toBeVisible()
    }
  })

  test('T4: FilterBar — search input działa', async ({ page }) => {
    const searchInput = page.locator('[aria-label="Filtry zadań"] input, input[placeholder*="szukaj"], input[placeholder*="Szukaj"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
    await searchInput.clear()
    await expect(searchInput).toHaveValue('')
  })

  test('T5: TaskModal — otwiera się po kliknięciu zadania', async ({ page }) => {
    const card = page.locator('[aria-label="Tytuł nowego zadania"]').first()
    const hasCard = await card.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!hasCard) {
      // Kliknij dowolny element wyglądający jak karta
      const anyCard = page.locator('[class*="task"], [class*="Task"]').first()
      const hasAny = await anyCard.isVisible({ timeout: 3_000 }).catch(() => false)
      if (!hasAny) {
        test.skip()
        return
      }
      await anyCard.click()
    } else {
      await card.click()
    }
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })
    // Zamknij modal
    const closeBtn = page.locator('[aria-label="Zamknij modal"]').first()
    if (await closeBtn.isVisible()) await closeBtn.click()
  })
})
