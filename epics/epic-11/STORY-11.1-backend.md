---
story_id: STORY-11.1
title: "Developer konfiguruje GitHub Actions CI — lint, typecheck i unit testy na każdy PR"
epic: EPIC-11
module: ci-cd
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: none
blocks: STORY-11.2, STORY-11.3, STORY-11.4, STORY-11.5
tags: [ci, github-actions, jest, typescript, lint]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby GitHub Actions automatycznie uruchamiał lint, typecheck i unit testy na każdy PR i push do `main`
**Żeby** błędy były wykrywane przed merge, bez ręcznego uruchamiania testów lokalnie

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`.github/workflows/ci.yml` — nowy plik workflow

### Powiązane pliki
- `package.json` — skrypty: `lint`, `typecheck`, `test`
- `jest.config.ts` — konfiguracja Jest
- `.eslintrc.json` — konfiguracja ESLint

### Stan systemu przed tą story
- Projekt ma skonfigurowany Jest (EPIC-14)
- ESLint i TypeScript są zainstalowane
- `package.json` zawiera skrypty: `npm run lint`, `npm run typecheck`, `npm test`

---

## ✅ Acceptance Criteria

### AC-1: Workflow uruchamia się na PR i push do main
GIVEN: developer tworzy PR lub pushuje do `main`
WHEN: GitHub wykrywa zdarzenie `pull_request` lub `push` na branch `main`
THEN: workflow `ci.yml` startuje automatycznie w ciągu 30 sekund

### AC-2: Lint przechodzi bez błędów
GIVEN: workflow uruchomiony na kodzie bez błędów ESLint
WHEN: job `lint` wykonuje `npm run lint`
THEN: job kończy się statusem `success` i nie blokuje dalszych jobów

### AC-3: TypeCheck przechodzi bez błędów
GIVEN: workflow uruchomiony na kodzie bez błędów TypeScript
WHEN: job `typecheck` wykonuje `npx tsc --noEmit`
THEN: job kończy się statusem `success`

### AC-4: Unit testy przechodzą
GIVEN: workflow uruchomiony na kodzie z zielonymi testami
WHEN: job `test` wykonuje `npm test -- --ci --coverage`
THEN: job kończy się statusem `success`, raport pokrycia jest dostępny jako artifact

### AC-5: Failure blokuje merge
GIVEN: PR z kodem który nie przechodzi lint lub testów
WHEN: workflow zakończy się statusem `failure`
THEN: PR pokazuje czerwony status check i nie można go merge'ować (branch protection)

---

## ⚙️ Szczegóły Backend

### Struktura workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --ci --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
```

### Wymagane skrypty w package.json
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  }
}
```

### Cache strategia
- `actions/setup-node` z `cache: 'npm'` — cache node_modules po `package-lock.json`
- Czas cold start: ~60s, warm start: ~20s

### Env vars potrzebne w CI
```
NEXT_PUBLIC_SUPABASE_URL=*** (z GitHub Secrets)
NEXT_PUBLIC_SUPABASE_ANON_KEY=*** (z GitHub Secrets)
```
Dodaj do job `test` jako `env:` — wymagane żeby unit testy z mockami Supabase się kompilowały.

---

## ⚠️ Edge Cases

### EC-1: Brak skryptu `typecheck` w package.json
Scenariusz: `npm run typecheck` failuje z "Missing script"
Oczekiwane zachowanie: Dodaj skrypt `"typecheck": "tsc --noEmit"` do package.json przed commitem

### EC-2: Testy wymagają env vars których nie ma w CI
Scenariusz: Jest failuje z `Cannot read NEXT_PUBLIC_SUPABASE_URL`
Oczekiwane zachowanie: Dodaj env vars jako GitHub Secrets i wstrzyknij do workflow przez `env:`

### EC-3: ESLint `--max-warnings 0` blokuje na ostrzeżeniach
Scenariusz: Kod ma warnings które lokalnie były ignorowane
Oczekiwane zachowanie: Napraw warnings LUB zmień na `--max-warnings 10` tymczasowo z komentarzem TODO

---

## 🚫 Out of Scope tej Story
- Deploy do Vercel (STORY-11.2, 11.3)
- E2E testy (STORY-11.4)
- Branch protection rules (STORY-11.5)
- Konfiguracja secrets (STORY-11.6)

---

## ✔️ Definition of Done
- [ ] Plik `.github/workflows/ci.yml` istnieje w repozytorium
- [ ] Workflow uruchamia się automatycznie na PR do `main`
- [ ] Jobs: `lint`, `typecheck`, `test` — wszystkie zielone na aktualnym kodzie
- [ ] Coverage report dostępny jako GitHub Actions artifact
- [ ] `npm ci` używane zamiast `npm install` (deterministyczne)
- [ ] Node cache skonfigurowany (szybszy CI)
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
