---
story_id: STORY-11.1
title: "Vitest setup — unit tests dla komponentów React + backend utils"
epic: EPIC-11
module: infrastructure
domain: infrastructure
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: should
estimated_effort: 6 h
depends_on: [STORY-0.1, STORY-0.8]
blocks: [STORY-11.3]
tags: [vitest, testing, unit-tests, react, hooks, coverage]
---

## 🎯 User Story

**Jako** Mariusz (developer)  
**Chcę** mieć skonfigurowany Vitest z @testing-library/react i działające testy jednostkowe  
**Żeby** wyłapywać regresje w hookach i utility functions przed mergem PR do `main`

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `pages/_shared/vitest.config.ts` — konfiguracja Vitest
- `pages/_shared/src/__tests__/` — katalog testów
- `pages/_shared/src/hooks/__tests__/` — testy hooków
- `pages/_shared/src/utils/__tests__/` — testy utility functions
- `package.json` (root lub `pages/_shared/`) — skrypty `test`, `test:coverage`

### Powiązane pliki
- `pages/_shared/src/hooks/useAuth.ts` — hook autoryzacji (PIN-based)
- `pages/_shared/src/hooks/useSSE.ts` — hook Server-Sent Events
- `pages/_shared/src/utils/cn.ts` — utility do łączenia klas CSS
- `pages/_shared/src/utils/gateParser.ts` — parser bramek w pipeline
- `pages/_shared/src/utils/recurringScheduler.ts` — scheduler zadań cyklicznych

### Stan systemu przed tą story
- STORY-0.1 ukończona: repo skonfigurowane, `pages/_shared/` istnieje, Node.js + npm działa
- STORY-0.8 ukończona: komponenty React i hooki istnieją w `pages/_shared/src/`
- `package.json` zawiera zależności React i TypeScript

---

## ✅ Acceptance Criteria

### AC-1: Vitest config działa z jsdom
GIVEN: `pages/_shared/vitest.config.ts` istnieje z `environment: 'jsdom'`  
WHEN: uruchomiony jest `npm run test` w katalogu `pages/_shared/`  
THEN: Vitest startuje bez błędów, wykrywa pliki `*.test.ts` i `*.test.tsx`  
AND: środowisko jsdom jest dostępne (globalny `document`, `window`)

### AC-2: Testy dla utility `cn()`
GIVEN: plik `pages/_shared/src/utils/__tests__/cn.test.ts` istnieje  
WHEN: uruchomiony `npm run test`  
THEN: min 3 testy dla `cn()` — łączenie klas, warunkowe klasy, falsy values — wszystkie PASS

### AC-3: Testy dla `useAuth` hook
GIVEN: plik `pages/_shared/src/hooks/__tests__/useAuth.test.tsx` istnieje z `renderHook` z @testing-library/react  
WHEN: uruchomiony `npm run test`  
THEN: min 3 testy — inicjalizacja stanu `isAuthenticated: false`, poprawny PIN zwraca `isAuthenticated: true`, błędny PIN nie zmienia stanu — wszystkie PASS

### AC-4: Testy dla `useSSE` hook
GIVEN: `useSSE` jest zamockowany (globalny `EventSource` mockowany przez vi.stubGlobal)  
WHEN: uruchomiony `npm run test`  
THEN: min 2 testy — połączenie inicjalizuje EventSource z poprawnym URL, disconnect wywołuje `eventSource.close()` — PASS

### AC-5: Coverage > 60% dla plików objętych testami
GIVEN: uruchomiony `npm run test:coverage`  
WHEN: raport coverage zostaje wygenerowany  
THEN: coverage dla `pages/_shared/src/utils/` i `pages/_shared/src/hooks/` wynosi ≥ 60%  
AND: raport jest zapisywany do `coverage/` (ignorowany przez .gitignore)

### AC-6: Skrypt `test:coverage` w package.json
GIVEN: `package.json` w `pages/_shared/` (lub root)  
WHEN: `npm run test:coverage`  
THEN: uruchamia `vitest run --coverage` z reporter `v8` lub `istanbul`  
AND: exit code 0 gdy wszystkie testy pass

---

## 🏗️ Szczegóły Infrastruktury

### Wymagane zależności (devDependencies)
```json
{
  "vitest": "^1.x",
  "@vitest/coverage-v8": "^1.x",
  "@testing-library/react": "^14.x",
  "@testing-library/jest-dom": "^6.x",
  "jsdom": "^24.x"
}
```

### `vitest.config.ts` — struktura
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test-setup.ts'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
      },
    },
  },
})
```

### `src/test-setup.ts`
```typescript
import '@testing-library/jest-dom'
// Globalne mocki jeśli potrzebne (localStorage, EventSource)
```

### Testy do napisania (min 10 łącznie)
| Plik testowy | Funkcja/hook | Min testów |
|---|---|---|
| `utils/__tests__/cn.test.ts` | `cn()` | 3 |
| `hooks/__tests__/useAuth.test.tsx` | `useAuth` | 3 |
| `hooks/__tests__/useSSE.test.tsx` | `useSSE` | 2 |
| `utils/__tests__/gateParser.test.ts` | `parseGate()` | 2 |
| **Razem** | — | **≥ 10** |

---

## ⚠️ Edge Cases

### EC-1: EventSource niedostępny w jsdom
Scenariusz: jsdom nie ma globalnego `EventSource` — `useSSE` crashuje przy inicjalizacji  
Oczekiwane zachowanie: `vi.stubGlobal('EventSource', MockEventSource)` w setup lub w teście; testy nie failują z "EventSource is not defined"

### EC-2: Testy zależne od localStorage (useAuth persists PIN hash)
Scenariusz: `localStorage` w jsdom persystuje między testami jeśli nie wyczyszczony  
Oczekiwane zachowanie: `beforeEach(() => localStorage.clear())` w każdym describe bloku dla useAuth; testy są izolowane

### EC-3: Coverage threshold fail na CI
Scenariusz: coverage spada poniżej 60% po zmianie kodu  
Oczekiwane zachowanie: `vitest run --coverage` kończy się exit code 1; CI job "test" failuje i blokuje merge PR

### EC-4: Brak pliku `gateParser.ts` lub `recurringScheduler.ts`
Scenariusz: te utilities jeszcze nie istnieją (zależność od STORY-0.8)  
Oczekiwane zachowanie: testy dla nieistniejących plików są pomijane (`.skip`) lub plik testowy nie jest tworzony dopóki utility nie istnieje

---

## 🚫 Out of Scope tej Story
- E2E testy (Playwright) — to STORY-11.2
- GitHub Actions workflow — to STORY-11.3
- Testy dla komponentów UI (np. ShoppingList, KanbanBoard) — zbyt zależne od backendu
- Integration testy z prawdziwym server.cjs

---

## ✔️ Definition of Done
- [ ] `vitest.config.ts` istnieje w `pages/_shared/`
- [ ] `npm run test` uruchamia wszystkie testy i pokazuje wyniki
- [ ] Min 10 testów PASS (cn, useAuth, useSSE, gateParser)
- [ ] `npm run test:coverage` generuje raport, coverage ≥ 60%
- [ ] `src/test-setup.ts` z `@testing-library/jest-dom` istnieje
- [ ] `.gitignore` zawiera `/coverage`
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO (Mariusz)
