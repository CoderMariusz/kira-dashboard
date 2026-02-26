---
story_id: STORY-11.3
title: "Developer konfiguruje automatyczny production deploy na Vercel po merge do main"
epic: EPIC-11
module: ci-cd
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: STORY-11.1, STORY-11.2, STORY-11.6
blocks: STORY-11.5
tags: [ci, github-actions, vercel, production-deploy]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby każdy merge do `main` automatycznie deployował produkcję na Vercel
**Żeby** nie musieć ręcznie uruchamiać `vercel --prod` po każdym merge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`.github/workflows/deploy.yml` — nowy workflow

### Powiązane pliki
- `.github/workflows/ci.yml` (STORY-11.1) — CI musi przejść na main
- `.github/workflows/preview.yml` (STORY-11.2) — analogiczny pattern
- `STORY-11.6` — secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### Stan systemu przed tą story
- STORY-11.1 i STORY-11.2 DONE
- STORY-11.6 DONE — secrets skonfigurowane

---

## ✅ Acceptance Criteria

### AC-1: Deploy uruchamia się tylko po merge do main
GIVEN: PR został zmergowany do `main`
WHEN: GitHub wykrywa `push` na branch `main`
THEN: workflow `deploy.yml` startuje automatycznie

### AC-2: Deploy trafia na produkcję (nie preview)
GIVEN: workflow uruchomiony po merge
WHEN: Vercel CLI buduje kod z `main`
THEN: deploy używa flagi `--prod` i trafia na URL produkcyjny `kira-family-dashboard.vercel.app`

### AC-3: Deploy czeka na sukces CI
GIVEN: push do `main` (np. bezpośredni bez PR)
WHEN: CI workflow na `main` nie zakończył się sukcesem
THEN: deploy workflow nie startuje (dependency na CI job lub workflow)

### AC-4: Wynik deploy widoczny w GitHub
GIVEN: deploy zakończony (sukces lub fail)
WHEN: sprawdzasz zakładkę "Actions" w GitHub repo
THEN: widzisz status deploy — zielony URL produkcji lub czerwony komunikat błędu

### AC-5: Produkcja nie deployuje się gdy build fail
GIVEN: `next build` failuje (np. TypeScript error w main)
WHEN: Vercel CLI zwraca błąd
THEN: workflow kończy się `failure`, poprzedni deploy pozostaje aktywny

---

## ⚙️ Szczegóły Backend

### Struktura workflow

```yaml
# .github/workflows/deploy.yml
name: Production Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Deploy to Vercel (Production)
        run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### GitHub Environment `production`
Utwórz environment "production" w GitHub repo → Settings → Environments:
- Required reviewers: opcjonalnie (można pominąć)
- Deployment branches: tylko `main`
- Secrets: można nadpisać na poziomie env jeśli potrzeba

### Różnica vs preview
| | Preview (11.2) | Production (11.3) |
|---|---|---|
| Trigger | PR | Push/merge do main |
| Vercel flag | (brak) | `--prod` |
| URL | unikalne per PR | stały produkcyjny |
| Environment | - | `production` |

---

## ⚠️ Edge Cases

### EC-1: Dwa merge'e w krótkim czasie
Scenariusz: dwa pushe do main w ciągu 30 sekund
Oczekiwane zachowanie: GitHub Actions uruchamia dwa workflow — Vercel automatycznie anuluje starszy deploy

### EC-2: Deploy fail — poprzedni deploy nadal aktywny
Scenariusz: `next build` failuje na produkcji
Oczekiwane zachowanie: Vercel nie podmienia aktualnego deploy — użytkownicy widzą poprzednią wersję. Alert w Actions.

### EC-3: Secrets niedostępne dla environment `production`
Scenariusz: secrets są na poziomie repo, nie environment
Oczekiwane zachowanie: użyj secrets repozytorium (`secrets.VERCEL_TOKEN`) — działają dla wszystkich environments

---

## 🚫 Out of Scope tej Story
- Rollback do poprzedniej wersji (manual przez Vercel dashboard)
- Notyfikacje o deploy (EPIC-13)
- Smoke testy po deploy (EPIC-13)

---

## ✔️ Definition of Done
- [ ] Plik `.github/workflows/deploy.yml` istnieje
- [ ] Merge do `main` trigguje automatyczny production deploy
- [ ] Deploy używa flagi `--prod` (nie preview)
- [ ] Environment `production` skonfigurowany w GitHub
- [ ] Deploy fail nie nadpisuje poprzedniej produkcji
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
