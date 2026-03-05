---
story_id: STORY-11.2
title: "Playwright E2E — smoke tests: login, dashboard load, shopping CRUD"
epic: EPIC-11
module: infrastructure
domain: infrastructure
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: should
estimated_effort: 6 h
depends_on: [STORY-3.1, STORY-4.3]
blocks: [STORY-11.3]
tags: [playwright, e2e, smoke-tests, login, dashboard, shopping]
---

## 🎯 User Story

**Jako** Mariusz (developer)  
**Chcę** mieć automatyczne smoke testy E2E w Playwright  
**Żeby** mieć pewność że core flow — login, dashboard load, shopping CRUD — nie regresuje po każdym PR

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `e2e/` — katalog testów Playwright (root projektu)
- `e2e/playwright.config.ts` — konfiguracja Playwright
- `e2e/tests/smoke.spec.ts` — plik ze smoke testami
- `e2e/tests/shopping.spec.ts` — testy CRUD zakupów
- `e2e/fixtures/` — helper fixtures (np. zalogowany stan)

### Powiązane pliki
- `server.cjs` — serwer Node.js (base URL: `http://localhost:3000`)
- `pages/home/dist/index.html` — Home Dashboard page (zakupy, aktywność)
- `pages/_shared/src/hooks/useAuth.ts` — auth z PIN
- API: `GET /api/shopping`, `POST /api/shopping`, `PATCH /api/shopping/:id`, `DELETE /api/shopping/:id`

### Stan systemu przed tą story
- STORY-3.1 ukończona: auth z PIN działa — formularz logowania + sesja
- STORY-4.3 ukończona: Shopping List — UI z add/bought/delete działa
- `server.cjs` uruchamiany lokalnie na porcie 3000
- Builde Vite dla `pages/home/` istnieją (`dist/`)

---

## ✅ Acceptance Criteria

### AC-1: Playwright instalacja i konfiguracja
GIVEN: `e2e/playwright.config.ts` istnieje  
WHEN: `npm run e2e` w root projektu  
THEN: Playwright startuje w trybie headless (Chromium), łączy się z `http://localhost:3000`  
AND: konfiguracja zawiera `webServer: { command: 'node server.cjs', port: 3000, reuseExistingServer: true }`  

### AC-2: Smoke test — login z PIN
GIVEN: aplikacja działa na localhost:3000, PIN ustawiony w env `TEST_PIN`  
WHEN: test otwiera `/` i wpisuje poprawny PIN  
THEN: użytkownik jest zalogowany (element `[data-testid="user-avatar"]` lub `/dashboard` widoczny)  
AND: test PASS w czasie < 10s

### AC-3: Smoke test — dashboard load < 3s
GIVEN: użytkownik jest zalogowany (fixture: `authenticatedPage`)  
WHEN: test nawiguje do Home Dashboard  
THEN: strona ładuje się w czasie < 3000ms (mierzone przez `performance.timing` lub Playwright `page.goto` responseTime)  
AND: widoczny jest co najmniej jeden widget (Kanban, Shopping lub Activity)

### AC-4: Shopping — dodanie produktu
GIVEN: zalogowany użytkownik jest na stronie Shopping List  
WHEN: test wypełnia pole input nazwą "Mleko 3.2%" i klika "Dodaj"  
THEN: nowy element "Mleko 3.2%" pojawia się na liście zakupów  
AND: checkbox jest niezaznaczony (status: `active`)

### AC-5: Shopping — oznaczenie jako kupione
GIVEN: na liście zakupów istnieje element "Mleko 3.2%"  
WHEN: test klika checkbox przy tym elemencie  
THEN: element otrzymuje klasę `bought` lub atrybut `data-status="bought"`  
AND: wizualnie element jest przekreślony lub przeniesiony do sekcji "Kupione"

### AC-6: Shopping — usunięcie produktu
GIVEN: na liście zakupów istnieje element "Mleko 3.2%"  
WHEN: test klika przycisk "Usuń" (lub X) przy tym elemencie i potwierdza jeśli dialog  
THEN: element znika z listy zakupów  
AND: `GET /api/shopping` nie zwraca już tego elementu

---

## 🏗️ Szczegóły Infrastruktury

### Wymagane zależności (devDependencies)
```json
{
  "@playwright/test": "^1.40.x"
}
```

### Instalacja przeglądarek
```bash
npx playwright install chromium
```

### `playwright.config.ts` — struktura
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node server.cjs',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
```

### Fixture — zalogowany użytkownik
```typescript
// e2e/fixtures/auth.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/')
    await page.fill('[data-testid="pin-input"]', process.env.TEST_PIN || '1234')
    await page.click('[data-testid="pin-submit"]')
    await page.waitForURL('**/dashboard')
    await use(page)
  },
})
```

### Zmienne środowiskowe
```env
# .env.test (NIE commitować do git)
TEST_PIN=1234
BASE_URL=http://localhost:3000
```

### 5 scenariuszy smoke E2E
| # | Opis | Plik |
|---|---|---|
| 1 | Login z poprawnym PIN | `smoke.spec.ts` |
| 2 | Dashboard load < 3s | `smoke.spec.ts` |
| 3 | Shopping: add item | `shopping.spec.ts` |
| 4 | Shopping: mark bought | `shopping.spec.ts` |
| 5 | Shopping: delete item | `shopping.spec.ts` |

---

## ⚠️ Edge Cases

### EC-1: Server nie startuje na czas
Scenariusz: `node server.cjs` startuje wolno (cold start > 10s na CI)  
Oczekiwane zachowanie: `webServer.timeout: 30_000` w playwright.config.ts; CI workflow ma `wait-on http://localhost:3000` lub Playwright auto-wait

### EC-2: TEST_PIN nieustawiony
Scenariusz: CI nie ma ustawionej zmiennej `TEST_PIN`  
Oczekiwane zachowanie: testy korzystają z fallback `|| '1234'`; alternatywnie CI ma secret `TEST_PIN` w GitHub Actions env  
Komunikat: jeśli PIN błędny — test failuje z czytelnym asercja failure "Expected URL to match **/dashboard"

### EC-3: Build pages nieistnieje (brak `dist/`)
Scenariusz: CI nie zbudowało pages Vite przed uruchomieniem E2E  
Oczekiwane zachowanie: GitHub Actions CI (STORY-11.3) ma job order: `build` → `e2e`; lokalnie `npm run build` jest prerequisite

### EC-4: Shopping API nie odpowiada (serwer bez danych)
Scenariusz: baza SQLite jest pusta, API zwraca pustą listę  
Oczekiwane zachowanie: testy shopping używają `beforeEach` do seed danych lub tworzą nowy element w każdym teście; testy nie zależą od stanu bazy

---

## 🚫 Out of Scope tej Story
- Pełne testy regresji dla wszystkich stron (Pipeline, Models, Eval) — to future faza
- Testy wizualne (screenshot comparison) — zbyt fragile
- Testy wydajnościowe (Lighthouse CI) — poza scope
- Load testing — poza scope

---

## ✔️ Definition of Done
- [ ] `e2e/playwright.config.ts` istnieje z poprawną konfiguracją webServer
- [ ] Min 5 smoke testów w `e2e/tests/` (login, dashboard, shopping CRUD)
- [ ] Wszystkie testy PASS lokalnie (`npm run e2e`)
- [ ] Playwright browser (Chromium) zainstalowany
- [ ] `.env.test.example` z placeholders dla `TEST_PIN`
- [ ] `screenshots/` i `test-results/` w `.gitignore`
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO (Mariusz)
