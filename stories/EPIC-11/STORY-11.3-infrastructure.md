---
story_id: STORY-11.3
title: "GitHub Actions CI — lint + test + build na PR"
epic: EPIC-11
module: infrastructure
domain: infrastructure
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 3 h
depends_on: [STORY-11.1, STORY-11.2]
blocks: []
tags: [github-actions, ci, lint, eslint, vitest, playwright, build]
---

## 🎯 User Story

**Jako** Mariusz (developer)  
**Chcę** mieć GitHub Actions workflow uruchamiający lint + testy + build na każdym PR do `main`  
**Żeby** każdy PR miał automatyczny status check i nie można było zmergować kodu z błędami

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `.github/workflows/pr-check.yml` — główny workflow CI

### Powiązane pliki
- `package.json` (root) — skrypty: `lint`, `test`, `test:coverage`, `build`, `e2e`
- `pages/_shared/vitest.config.ts` — konfiguracja testów (STORY-11.1)
- `e2e/playwright.config.ts` — konfiguracja E2E (STORY-11.2)
- `.eslintrc.js` lub `eslint.config.js` — konfiguracja lintera
- `server.cjs` — serwer do weryfikacji `node server.cjs --check`

### Stan systemu przed tą story
- STORY-11.1 ukończona: Vitest działa, `npm run test` i `npm run test:coverage` działają
- STORY-11.2 ukończona: Playwright działa, `npm run e2e` działa
- ESLint skonfigurowany (`npm run lint` działa bez błędów)
- Repo na GitHub, branch `main` istnieje

---

## ✅ Acceptance Criteria

### AC-1: Workflow trigger na PR
GIVEN: `.github/workflows/pr-check.yml` istnieje w repo  
WHEN: developer otwiera PR do brancha `main`  
THEN: GitHub Actions automatycznie uruchamia workflow `PR Check`  
AND: status check pojawia się na PR (pending → pass/fail)

### AC-2: Job lint — ESLint przechodzi
GIVEN: PR zawiera poprawny kod TypeScript/JavaScript  
WHEN: job `lint` uruchamia `npm run lint`  
THEN: ESLint kończy się exit code 0  
AND: job jest oznaczony jako PASS w GitHub Actions UI

### AC-3: Job test — Vitest przechodzi
GIVEN: kod zawiera min 10 unit testów (STORY-11.1)  
WHEN: job `test` uruchamia `npm run test:coverage`  
THEN: Vitest uruchamia wszystkie testy, coverage ≥ 60%, exit code 0  
AND: job jest oznaczony jako PASS

### AC-4: Job e2e — Playwright smoke testy przechodzą
GIVEN: builde pages Vite istnieją (job `build` zakończony przed `e2e`)  
WHEN: job `e2e` uruchamia `npm run e2e`  
THEN: 5 smoke testów PASS w trybie headless Chromium  
AND: job jest oznaczony jako PASS

### AC-5: Blokada merge przy fail
GIVEN: PR zawiera błąd (failing test lub lint error)  
WHEN: CI workflow failuje na dowolnym jobie  
THEN: GitHub status check jest czerwony, przycisk "Merge" jest zablokowany (jeśli branch protection ustawiony)  
AND: developer widzi który job fail i może kliknąć w logi

---

## 🏗️ Szczegóły Infrastruktury

### `.github/workflows/pr-check.yml` — pełna struktura
```yaml
name: PR Check

on:
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage

  build:
    name: Build Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      # Weryfikacja server syntax
      - run: node server.cjs --check || node --check server.cjs

  e2e:
    name: E2E Smoke Tests
    runs-on: ubuntu-latest
    needs: [build]
    env:
      TEST_PIN: ${{ secrets.TEST_PIN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: npm run build
      - run: npm run e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### GitHub Branch Protection (ustawienie ręczne przez Mariusza)
```
Settings → Branches → main:
- Require status checks: lint, test, build, e2e
- Require branches to be up to date before merging: ✓
```

### Secrets wymagane w GitHub repo
```
Settings → Secrets → Actions:
TEST_PIN = <wartość PIN dev>
```

### CI time target
Wszystkie 4 joby (równolegle) powinny zakończyć się w ≤ 5 minut.

---

## ⚠️ Edge Cases

### EC-1: `npm ci` fail — brak `package-lock.json`
Scenariusz: lock file nie jest commitowany do repo  
Oczekiwane zachowanie: `package-lock.json` musi być w `.gitignore`'s whitelist (nie ignorowany); alternatywnie `npm install` zamiast `npm ci`

### EC-2: Playwright install na ubuntu-latest — brak zależności systemowych
Scenariusz: `npx playwright install chromium` bez `--with-deps` może brakować libów  
Oczekiwane zachowanie: `npx playwright install chromium --with-deps` instaluje system dependencies; bez tego E2E job crashuje z "Host system is missing dependencies"

---

## 🚫 Out of Scope tej Story
- Automatyczny deploy po merge (ręczny przez `make deploy`) — EPIC-11 out of scope
- Notification Slack/Discord po fail — future enhancement
- Matrix testing (Node 18 + 20) — overhead niepotrzebny
- Docker build w CI — poza scope dla Mac Mini deployment

---

## ✔️ Definition of Done
- [ ] `.github/workflows/pr-check.yml` istnieje i jest poprawny YAML
- [ ] Workflow uruchamia się automatycznie na PR (trigger `pull_request → main`)
- [ ] 4 joby: lint, test, build, e2e — wszystkie PASS na czystym repo
- [ ] `e2e` job używa `needs: [build]` (prawidłowa kolejność)
- [ ] Playwright artifacts uploadowane on failure
- [ ] GitHub Secret `TEST_PIN` udokumentowany w README lub CONTRIBUTING.md
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO (Mariusz)
