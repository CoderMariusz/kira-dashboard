---
story_id: STORY-11.4
title: "Developer uruchamia Playwright E2E smoke testy w CI na preview deploy"
epic: EPIC-11
module: ci-cd
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: should
estimated_effort: 6h
depends_on: STORY-11.1, STORY-11.2
blocks: STORY-11.5
tags: [ci, github-actions, playwright, e2e, smoke-tests]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby Playwright E2E smoke testy uruchamiały się automatycznie na preview deploy w CI
**Żeby** wykryć regresje w krytycznych ścieżkach użytkownika (login, dashboard, pipeline) przed merge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `.github/workflows/e2e.yml` — nowy workflow
- `e2e/` — katalog z testami Playwright (jeśli brak: stworzyć)
- `playwright.config.ts` — konfiguracja Playwright

### Powiązane pliki
- `.github/workflows/preview.yml` (STORY-11.2) — E2E uruchamia się NA preview URL
- `e2e/smoke/` — krótkie testy krytycznych ścieżek

### Stan systemu przed tą story
- STORY-11.1 DONE (CI)
- STORY-11.2 DONE (preview deploy + output URL)
- Playwright zainstalowany (`@playwright/test` w devDependencies)

---

## ✅ Acceptance Criteria

### AC-1: E2E workflow uruchamia się po preview deploy
GIVEN: preview deploy dla PR zakończył się sukcesem (STORY-11.2)
WHEN: workflow `e2e.yml` jest triggerowany przez sukces `preview.yml` lub jest osobnym jobem po deploy
THEN: Playwright startuje testy contra preview URL

### AC-2: Smoke test — login działa
GIVEN: preview URL dostępny, Supabase działa
WHEN: Playwright otwiera `/login` i loguje się testowym kontem (`test@kira.dev`)
THEN: redirect do `/home`, sidebar widoczny, brak błędów JS w konsoli

### AC-3: Smoke test — dashboard pipeline widoczny
GIVEN: zalogowany użytkownik
WHEN: Playwright przechodzi na `/dashboard`
THEN: strona ładuje się w <3s, widoczny co najmniej jeden element pipeline (epic lub story card)

### AC-4: Smoke test — strona /settings/users dostępna dla ADMIN
GIVEN: zalogowany użytkownik z rolą ADMIN
WHEN: Playwright przechodzi na `/settings/users`
THEN: tabela użytkowników widoczna, brak przekierowania na `/403`

### AC-5: Wyniki testów jako GitHub Actions report
GIVEN: testy zakończone (sukces lub fail)
WHEN: workflow kończy job
THEN: raport HTML Playwright dostępny jako artifact, wyniki widoczne w zakładce Actions

### AC-6: Fail E2E blokuje merge
GIVEN: E2E testy failują na preview
WHEN: PR czeka na merge
THEN: status check `e2e` jest czerwony, branch protection blokuje merge

---

## ⚙️ Szczegóły Backend

### Struktura workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  workflow_run:
    workflows: ["Preview Deploy"]
    types: [completed]

jobs:
  e2e:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Get preview URL
        id: preview-url
        # Pobierz URL z poprzedniego workflow (via artifacts lub GitHub API)
        run: |
          # Alternatywnie: hardcode pattern URL Vercela
          echo "url=https://kira-dashboard-git-${{ github.event.workflow_run.head_branch }}-codermariuszs-projects.vercel.app" >> $GITHUB_OUTPUT

      - name: Run E2E smoke tests
        run: npx playwright test e2e/smoke/
        env:
          PLAYWRIGHT_BASE_URL: ${{ steps.preview-url.outputs.url }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Smoke testy do napisania

```
e2e/
  smoke/
    auth.spec.ts        # login + logout
    dashboard.spec.ts   # strona główna pipeline
    settings.spec.ts    # /settings/users ADMIN access
```

### playwright.config.ts — konfiguracja CI

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['html'], ['github']],
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
})
```

### Konto testowe w Supabase
- Utwórz użytkownika `test@kira.dev` z rolą ADMIN w Supabase
- Dodaj do GitHub Secrets: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`
- **Nie używaj konta Mariusza** — dedykowane konto testowe

---

## ⚠️ Edge Cases

### EC-1: Preview URL nie jest jeszcze dostępny gdy E2E startuje
Scenariusz: Vercel potrzebuje 30-60s na deploy, E2E startuje za wcześnie
Oczekiwane zachowanie: dodaj `wait-on` lub pętlę `curl -retry` zanim startują testy:
```bash
npx wait-on --timeout 120000 $PLAYWRIGHT_BASE_URL
```

### EC-2: Test konto nie ma dostępu do Supabase na preview
Scenariusz: preview używa produkcyjnego Supabase ale konto testowe nie istnieje
Oczekiwane zachowanie: utwórz konto testowe w produkcyjnym Supabase i trzymaj credentials w GitHub Secrets

### EC-3: Flakey testy (niestabilne) blokują merge
Scenariusz: sieć wolna, Supabase timeout — test failuje losowo
Oczekiwane zachowanie: `retries: 2` w playwright.config.ts — 3 próby przed fail

### EC-4: `workflow_run` trigger — brak PR context
Scenariusz: `workflow_run` nie ma dostępu do `github.event.pull_request`
Oczekiwane zachowanie: użyj `github.event.workflow_run.head_branch` do zbudowania URL

---

## 🚫 Out of Scope tej Story
- Pełne E2E testy wszystkich features (EPIC-12)
- Visual regression testing
- Performance testing
- Mobile viewports

---

## ✔️ Definition of Done
- [ ] Plik `.github/workflows/e2e.yml` istnieje
- [ ] `playwright.config.ts` skonfigurowany dla CI
- [ ] Smoke testy: login, dashboard, settings — wszystkie zielone na preview
- [ ] Raport HTML dostępny jako artifact po każdym run
- [ ] Konto testowe `test@kira.dev` istnieje w Supabase
- [ ] `TEST_USER_EMAIL` i `TEST_USER_PASSWORD` w GitHub Secrets
- [ ] Fail E2E blokuje merge (status check)
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
