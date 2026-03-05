---
epic_id: EPIC-11
title: "CI/CD — GitHub Actions, Lint, Tests, Deploy"
module: infrastructure
status: draft
priority: could
estimated_size: S
risk: low
---

## 📋 OPIS

EPIC-11 konfiguruje CI/CD pipeline dla repozytorium kira-dashboard — GitHub Actions uruchamiające lint (ESLint) i testy (Vitest) na każdym PR do brancha `main`, oraz deployment script na Mac Mini przez `rsync` lub local npm script. Dostosowane do architektury KiraBoard (nie Next.js) — Vite builds per page, server.cjs Node.js, bez Vercel. Proste i praktyczne: jeśli CI pass, kod można mergować.

## 🎯 CEL BIZNESOWY

Każdy PR do KiraBoard przechodzi automatyczny lint i test — zero regresji w produkcji na Mac Mini Mariusza.

## 👤 PERSONA

**Mariusz (Admin)** — developer otwierający PR z nową featurą. Chce wiedzieć czy jego kod nie psuje niczego przed mergem. Kira (Agent) otwiera PRy po implementacji stories — CI jest automatycznym gate'em jakości.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Repo setup (GitHub repo `kira-board` z branch strategy)
- Wszystkie poprzednie EPICi — CI testuje kompletną aplikację

### Blokuje (ten epic odblokowuje):
- Brak — CI/CD to finalna faza (Faza 6)

## 📦 ZAKRES (In Scope)

- **GitHub Actions — PR workflow** — `.github/workflows/pr-check.yml`: trigger: `pull_request → main`; jobs: lint (ESLint + TypeScript check), test (Vitest unit tests), build check (Vite build per page powodzenia); warunek merge: wszystkie jobs pass
- **ESLint konfiguracja** — `.eslintrc.js` per `pages/_shared/` i per page: rules z `eslint:recommended` + `@typescript-eslint/recommended`; integrate z Prettier dla formatting
- **Vitest setup** — `vitest.config.ts` w `pages/_shared/`; testy dla: API client functions (mock fetch), utility functions (cn, date parsing), hooks (useAuth, useApi — z jsdom); coverage report
- **Build check per page** — w CI: `npm run build` w każdej `pages/*/` (pipeline, home, models, eval, nightclaw, patterns, settings, projects, skills); fail jeśli jakiś build się nie powiedzie
- **Deploy script** — `scripts/deploy.sh`: `git pull` + rebuild changed pages + `pm2 restart kiraboard`; do uruchomienia ręcznie lub przez `make deploy`; brak automatycznego deploy na PR (tylko po merge do main, manual trigger)
- **Makefile** — `make lint`, `make test`, `make build`, `make deploy` — convenience shortcuts

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Automatyczny deploy przez CI** — ręczny deploy po merge (zbyt ryzykowne na production Mac Mini bez staging)
- **E2E tests (Playwright)** — unit + integration tests wystarczą; E2E to future faza po stabilizacji
- **Docker containerization** — aplikacja działa natywnie na Mac Mini; Docker to over-engineering dla tego use case
- **Vercel / cloud deployment** — KiraBoard jest local-first na Mac Mini Mariusza; cloud deploy to poza scope

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] PR do `main` automatycznie uruchamia CI workflow w GitHub Actions; status badge widoczny na PR
- [ ] ESLint na `pages/_shared/` i co najmniej jednej page (pipeline) przechodzi bez błędów
- [ ] Vitest uruchamia ≥ 5 testów (utility functions + API client mocks) i wszystkie passują
- [ ] Build check: `npm run build` w `pages/pipeline/` i `pages/home/` kończy się sukcesem
- [ ] `make deploy` uruchamia script który robi `git pull` + rebuild + pm2 restart

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-11.1 | infrastructure | GitHub Actions — PR workflow (lint + test + build check) | Plik `.github/workflows/pr-check.yml` z jobami: ESLint, TypeScript check, Vitest, Vite build per page |
| STORY-11.2 | infrastructure | ESLint + Prettier config + Vitest setup | Konfiguracja ESLint z TypeScript rules, Prettier integration, `vitest.config.ts` z jsdom, pierwsze 5 testów dla `cn()` utility i `useAuth` hook |
| STORY-11.3 | infrastructure | Deploy script + Makefile + pm2 config | `scripts/deploy.sh` (git pull + build + pm2 restart), `Makefile` z shortcut targets, `ecosystem.config.js` dla pm2 |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | infrastructure |
| Priorytet | Could |
| Szacunek | S (1-2 dni) |
| Ryzyko | Niskie — standardowa konfiguracja CI; ryzyko: długi czas buildu jeśli wiele pages (mitygacja: parallel jobs) |
| Domeny | infrastructure |
| Stack | GitHub Actions, ESLint, TypeScript, Vitest, Vite, pm2, Make |
| Uwagi | pm2 zamiast `node server.cjs` bezpośrednio — `pm2 start server.cjs --name kiraboard`. `ecosystem.config.js` definiuje env vars, max restarts, log paths. CI time target: ≤ 3 minuty per PR. |
