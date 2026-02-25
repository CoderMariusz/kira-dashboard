---
story_id: STORY-7.3
title: "Playwright setup + smoke testy wszystkich stron"
epic: EPIC-7
domain: frontend
difficulty: moderate
recommended_model: sonnet
priority: must
depends_on: [STORY-7.1]
blocks: []
---

## 🎯 Cel
Zainstalować Playwright, skonfigurować go dla kira-dashboard i napisać smoke testy dla każdej głównej strony — żeby Kira mogła samodzielnie weryfikować które strony działają.

## ✅ Acceptance Criteria

### AC-1: Playwright zainstalowany i skonfigurowany
- `npm install -D @playwright/test`
- `npx playwright install chromium`
- `playwright.config.ts`:
  - `testDir: './tests'`
  - `baseURL: 'http://localhost:3000'`
  - `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`
  - `webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true }`

### AC-2: `package.json` scripts
```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:report": "playwright show-report"
```

### AC-3: Smoke test dla każdej głównej strony
Plik: `tests/smoke.spec.ts`

Przetestuj następujące strony (sprawdź rzeczywiste routes w `app/`):
- `/` (home/dashboard)
- `/pipeline` (jeśli istnieje)
- `/models` (jeśli istnieje)
- `/home` (jeśli istnieje)

Per strona:
- `await page.goto('/[route]')`
- `expect(response?.status()).not.toBe(500)` — brak server error
- `expect(page.locator('body')).toBeVisible()`
- Capture console errors → `expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)`

### AC-4: Strony wymagające auth — skip lub mock
- Jeśli strona wymaga logowania → sprawdź czy redirect to `/login` lub `/auth` (expected behavior)
- Nie wymagaj prawdziwej sesji w smoke testach

### AC-5: `npx playwright test` przechodzi
- Wszystkie smoke testy PASS (lub graceful SKIP dla chronionych stron)
- `test-results/` zawiera screenshoty z failów (jeśli są)

## ⚠️ Uwagi
- Sprawdź rzeczywiste routes: `ls app/` przed napisaniem testów
- `reuseExistingServer: true` — Playwright używa dev servera jeśli już działa
- Kira będzie uruchamiać: `npx playwright test --reporter=list 2>&1` przez exec
- NIE pisz testów klikania przez UI (to osobny epic) — tylko smoke "czy strona się ładuje"

## ✔️ DoD
- [ ] `npx playwright test` → exit 0
- [ ] Screenshoty w `test-results/` dla ewentualnych failów
- [ ] `playwright.config.ts` bez błędów TS
- [ ] Commit na `feature/STORY-7.3`
