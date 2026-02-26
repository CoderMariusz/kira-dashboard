---
story_id: STORY-12.15
title: "E2E testy — Playwright full flow na produkcji weryfikujący migrację"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: STORY-12.7, STORY-12.8, STORY-12.9, STORY-12.10, STORY-12.11, STORY-12.12, STORY-12.13, STORY-12.14
blocks: none
tags: [testing, e2e, playwright, smoke, supabase, migration-verification]
---

## 🎯 User Story

**Jako** developer
**Chcę** pełne E2E testy weryfikujące że dashboard na Vercelu działa bez Bridge
**Żeby** mieć pewność że migracja Bridge→Supabase nie zepsuła żadnej strony

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `e2e/migration/` — nowy katalog testów
- `e2e/migration/pipeline.spec.ts` — Pipeline page
- `e2e/migration/models.spec.ts` — Models page
- `e2e/migration/nightclaw.spec.ts` — NightClaw page
- `e2e/migration/patterns.spec.ts` — Patterns page
- `e2e/migration/settings.spec.ts` — Settings page
- `e2e/migration/home.spec.ts` — Home page (kontrolny — działa od EPIC-4)

### Stan systemu przed tą story
- STORY-12.14 DONE — unit + integration testy zielone
- STORY-12.7-12.13 DONE — wszystkie endpointy zmigrowane
- Dashboard deployowany na Vercelu
- Konto testowe `test@kira.dev` w Supabase (STORY-11.6)

---

## ✅ Acceptance Criteria

### AC-1: Pipeline page ładuje dane z Supabase
GIVEN: test zalogowany na Vercelu jako ADMIN
WHEN: Playwright naviguje na /dashboard
THEN: widoczne epics i stories z poprawnymi statusami (DONE count matches)
AND: żaden komponent nie pokazuje "error" ani pustego stanu (gdy dane istnieją)

### AC-2: Story detail page z runs
GIVEN: test zalogowany
WHEN: Playwright klika na dowolną story w pipeline
THEN: story detail page ładuje się z tytułem, statusem, listą runs
AND: runs posortowane od najnowszego

### AC-3: Models page z agregacjami
GIVEN: test zalogowany
WHEN: Playwright naviguje na /dashboard/models
THEN: widoczne karty modeli z: success_rate, total_runs, avg_duration
AND: co najmniej 1 model z >0 runs (jeśli są dane w Supabase)

### AC-4: NightClaw page z digest i research
GIVEN: test zalogowany
WHEN: Playwright naviguje na /dashboard/nightclaw
THEN: widoczny ostatni digest (jeśli istnieje) lub empty state
AND: research sekcja widoczna (lista findings lub "brak danych")

### AC-5: Patterns page z search i filtrami
GIVEN: test zalogowany
WHEN: Playwright naviguje na /dashboard/patterns
THEN: widoczne patterns i/lub lessons z Supabase
WHEN: wpisuje tekst w search box
THEN: lista filtruje się po tekście

### AC-6: Settings page — ADMIN access
GIVEN: test zalogowany jako ADMIN
WHEN: Playwright naviguje na /settings/users
THEN: tabela użytkowników widoczna z co najmniej 1 rekordem

### AC-7: Home page (kontrolny — bez zmian)
GIVEN: test zalogowany
WHEN: Playwright naviguje na /home
THEN: strona ładuje się poprawnie (shopping list, tasks) — weryfikacja że EPIC-4 nie zepsuty

### AC-8: Brak odwołań do Bridge HTTP w konsoli przeglądarki
GIVEN: Playwright z włączonym logowaniem konsoli
WHEN: nawigacja po wszystkich stronach
THEN: brak `ERR_CONNECTION_REFUSED` ani `fetchBridge failed` w console.error

---

## ⚙️ Szczegóły Backend

### Konfiguracja Playwright dla E2E migracji

```typescript
// playwright.config.ts — rozszerzenie
export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'smoke',
      testDir: './e2e/smoke',
    },
    {
      name: 'migration',
      testDir: './e2e/migration',
    },
  ],
  // ...
})
```

### Wzorzec testu

```typescript
// e2e/migration/pipeline.spec.ts
import { test, expect, type ConsoleMessage } from '@playwright/test'

test.describe('Pipeline page — Supabase migration', () => {
  const consoleErrors: string[] = []

  test.beforeEach(async ({ page }) => {
    // Loguj errory z konsoli
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/home')
  })

  test.afterEach(() => {
    // Sprawdź brak Bridge connection errors
    const bridgeErrors = consoleErrors.filter(
      e => e.includes('fetchBridge') || e.includes('127.0.0.1:8199') || e.includes('ERR_CONNECTION')
    )
    expect(bridgeErrors).toHaveLength(0)
    consoleErrors.length = 0
  })

  test('shows epics with progress', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Powinny być widoczne epics
    const epicCards = page.locator('[data-testid^="epic-"]')
    await expect(epicCards.first()).toBeVisible({ timeout: 10_000 })
  })

  test('shows stories in pipeline', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Powinny być widoczne stories
    const storyCards = page.locator('[data-testid^="story-"]')
    const count = await storyCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('story detail loads with runs', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Kliknij pierwszą story
    const firstStory = page.locator('[data-testid^="story-"]').first()
    await firstStory.click()

    // Powinien być widoczny detail z runs
    await expect(page.locator('text=Runs')).toBeVisible({ timeout: 5_000 })
  })
})
```

### Models page test

```typescript
// e2e/migration/models.spec.ts
test('models page shows model cards', async ({ page }) => {
  await page.goto('/dashboard/models')
  await page.waitForLoadState('networkidle')

  // Co najmniej 1 model card
  const modelCards = page.locator('[data-testid^="model-card-"]')
  await expect(modelCards.first()).toBeVisible({ timeout: 10_000 })

  // Sprawdź success_rate widoczny
  await expect(page.locator('text=success')).toBeVisible()
})
```

### NightClaw page test

```typescript
// e2e/migration/nightclaw.spec.ts
test('nightclaw page loads digest or empty state', async ({ page }) => {
  await page.goto('/dashboard/nightclaw')
  await page.waitForLoadState('networkidle')

  // Albo digest albo "Brak danych"
  const hasDigest = await page.locator('[data-testid="digest-viewer"]').isVisible()
  const hasEmpty = await page.locator('text=Brak').isVisible()
  expect(hasDigest || hasEmpty).toBe(true)
})
```

### Uruchomienie

```bash
# Na preview deploy
PLAYWRIGHT_BASE_URL=https://kira-dashboard-xxx.vercel.app \
TEST_USER_EMAIL=test@kira.dev \
TEST_USER_PASSWORD=xxx \
npx playwright test --project migration

# Lokalnie (z Supabase)
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
npx playwright test --project migration
```

---

## ⚠️ Edge Cases

### EC-1: Supabase puste (nowe konto, brak danych)
Scenariusz: test na czystym Supabase — brak stories, runs, digest
Oczekiwane zachowanie: testy sprawdzają empty states — nie failują na brak danych, failują na errory

### EC-2: Login timeout na Vercelu (cold start)
Scenariusz: Vercel serverless cold start — login trwa >10s
Oczekiwane zachowanie: `timeout: 15_000` na waitForURL, `retries: 1` w config

### EC-3: data-testid brakuje w komponentach
Scenariusz: testy szukają `[data-testid^="story-"]` ale komponent nie ma data-testid
Oczekiwane zachowanie: dodaj data-testid do kluczowych komponentów (story card, epic card, model card, digest viewer)

### EC-4: Flakey testy przez racing SSR
Scenariusz: strona SSR ładuje skeleton, SWR jeszcze nie pobrał danych
Oczekiwane zachowanie: `waitForLoadState('networkidle')` + `toBeVisible({ timeout: 10_000 })`

---

## 🚫 Out of Scope
- Write operation E2E (advance story) — zbyt ryzykowne na produkcji
- Performance assertions (page load <3s)
- Visual regression snapshots

---

## ✔️ Definition of Done
- [ ] 7 test plików w `e2e/migration/`
- [ ] Wszystkie testy zielone na preview deploy (Vercel)
- [ ] Brak `fetchBridge` errorów w konsoli przeglądarki
- [ ] Testy pokrywają: Pipeline, Models, NightClaw, Patterns, Settings, Home
- [ ] Playwright report HTML jako artifact
- [ ] `data-testid` dodane do brakujących komponentów
- [ ] Działa z `PLAYWRIGHT_BASE_URL` (preview + localhost)
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
