---
story_id: STORY-6.3
title: "POST /api/stories/bulk-action — masowe operacje advance/assign_model na stories"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: moderate
recommended_model: glm-5
priority: must
estimated_effort: 4h
depends_on: none
blocks: [STORY-6.5, STORY-6.8]
tags: [api, bridge-cli, bulk, stories, advance, pipeline, next.js, typescript]
---

## 🎯 User Story

**Jako** aplikacja frontendowa kira-dashboard
**Chcę** endpoint `POST /api/stories/bulk-action` który wykonuje operację (advance / assign_model) na wielu stories jednocześnie
**Żeby** użytkownik mógł zaznaczyć kilka stories checkboxami i przesunąć je wszystkie do nowego statusu jednym kliknięciem

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
app/api/stories/bulk-action/route.ts  → eksportuj POST
```

Stack:
- Next.js 16 App Router, `export const runtime = 'nodejs'`
- `child_process.execSync` — Bridge CLI (sekwencyjnie z 200ms sleep)
- `requireAdmin()` z `lib/utils/require-admin.ts`

Bridge CLI path:
```
/Users/mariuszkrawczyk/codermariusz/kira/.venv/bin/python -m bridge.cli advance <STORY-ID> <STATUS>
```
Ustaw `BRIDGE_CLI_CMD` z `process.env.BRIDGE_CLI_CMD` (fallback do hardcoded path) — żeby można było konfigurować przez env.

### Powiązane pliki
- `lib/utils/require-admin.ts`
- Istniejące endpointy advance/start w `app/api/pipeline/` (jeśli istnieją) — wzorzec Bridge CLI call

### Stan systemu przed tą story
- Bridge CLI działa lokalnie
- Istniejący single-story advance działa (EPIC-2)

---

## ✅ Acceptance Criteria

### AC-1: Advance 3 stories — happy path
GIVEN: zalogowany admin, `story_ids: ["STORY-1.1", "STORY-1.2", "STORY-1.3"]`, `action: "advance"`, `payload: { status: "REVIEW" }`
WHEN: `POST /api/stories/bulk-action` jest wywołany
THEN: Bridge CLI jest wywołany sekwencyjnie dla każdego ID z 200ms opóźnieniem między wywołaniami
AND: zwrócone jest `200 OK` z `{ results: [...], success_count: 3, failure_count: 0 }`
AND: każdy element w `results` ma `{ id, success: true }`

### AC-2: Partial success
GIVEN: `story_ids: ["STORY-1.1", "STORY-X.X"]` gdzie STORY-X.X nie istnieje
WHEN: `POST /api/stories/bulk-action` jest wywołany
THEN: STORY-1.1 wykonuje się pomyślnie, STORY-X.X zwraca błąd
AND: zwrócone jest `200 OK` (NIE 500) z `{ results: [{id: "STORY-1.1", success: true}, {id: "STORY-X.X", success: false, error: "..."}], success_count: 1, failure_count: 1 }`

### AC-3: Walidacja — za dużo story IDs
GIVEN: `story_ids` z 21 elementami
WHEN: `POST /api/stories/bulk-action` jest wywołany
THEN: endpoint zwraca `400 Bad Request` z body `{ "error": "Maksymalnie 20 stories na operację" }`

### AC-4: Walidacja — nieznana akcja
GIVEN: `action: "delete"` (nie w allowlist)
WHEN: `POST /api/stories/bulk-action` jest wywołany
THEN: endpoint zwraca `400 Bad Request` z body `{ "error": "Nieznana akcja. Dozwolone: advance, assign_model" }`

### AC-5: Brak auth
GIVEN: request bez tokena JWT
WHEN: `POST /api/stories/bulk-action` jest wywołany
THEN: endpoint zwraca `401 Unauthorized`

---

## ⚙️ Szczegóły Backend

### Endpoint
```
METHOD: POST
Path:   /api/stories/bulk-action
Auth:   Supabase JWT (requireAdmin)
Role:   ADMIN
```

### Request Schema
```typescript
interface RequestBody {
  story_ids: string[]        // 1–20 elementów, każdy pasuje do /^STORY-\d+\.\d+$/
  action: 'advance' | 'assign_model'
  payload?: {
    status?: string          // dla advance: "REVIEW" | "DONE" | "MERGE" | "REFACTOR"
    model?: string           // dla assign_model: "kimi" | "glm" | "sonnet" | "codex" | "haiku"
  }
}
```

### Response Schema
```typescript
// 200 OK (zawsze, nawet przy partial failure)
interface SuccessResponse {
  results: Array<{
    id: string
    success: boolean
    error?: string
  }>
  success_count: number
  failure_count: number
}
```

### Logika biznesowa (krok po kroku)
```
1. requireAdmin() → 401
2. Parsuj body → waliduj:
   - story_ids: array, 1–20 elementów → 400 jeśli > 20
   - action: 'advance' | 'assign_model' → 400 jeśli inne
   - dla advance: payload.status wymagany i w allowlist ["REVIEW", "DONE", "MERGE", "REFACTOR"]
   - dla assign_model: payload.model wymagany i w allowlist ["kimi", "glm", "sonnet", "codex", "haiku", "opus"]
3. Inicjalizuj results = []
4. Dla każdego story_id (SEKWENCYJNIE):
   a. sleep 200ms (Promise / setTimeout)
   b. try {
        if action === 'advance':
          execSync(`bridge.cli advance ${story_id} ${payload.status}`, { timeout: 10_000 })
        if action === 'assign_model':
          execSync(`bridge.cli assign-model ${story_id} ${payload.model}`, { timeout: 10_000 })
        results.push({ id: story_id, success: true })
      } catch (e) {
        results.push({ id: story_id, success: false, error: e.message.slice(0, 200) })
      }
5. success_count = results.filter(r => r.success).length
   failure_count = results.filter(r => !r.success).length
6. Zwróć 200 z { results, success_count, failure_count }
```

### Bridge CLI command format
```bash
# advance:
python -m bridge.cli advance STORY-1.1 REVIEW

# assign_model (jeśli CLI obsługuje):
python -m bridge.cli assign-model STORY-1.1 sonnet
# Jeśli bridge CLI nie ma assign-model: zwróć error dla tej akcji z komunikatem "assign_model nie jest jeszcze obsługiwane przez Bridge CLI"
```

---

## ⚠️ Edge Cases

### EC-1: Bridge CLI timeout (>10s) dla jednej story
Scenariusz: Bridge CLI wisi dla jednego wywołania
Oczekiwane zachowanie: `execSync` z `timeout: 10_000` → błąd ETIMEDOUT → `results[i].success = false`, `error: "Timeout — Bridge CLI nie odpowiedział w ciągu 10s"` ; kontynuuj dla pozostałych

### EC-2: Pusta lista story_ids
Scenariusz: `story_ids: []`
Oczekiwane zachowanie: 400 z "Lista stories nie może być pusta"

### EC-3: Bridge CLI nie zainstalowany (Vercel / brak venv)
Scenariusz: `execSync` rzuca ENOENT
Oczekiwane zachowanie: results[i].success = false, error zawiera "Bridge CLI niedostępne"; po pierwszym błędzie ENOENT możesz fail-fast dla pozostałych z tym samym błędem

---

## 🚫 Out of Scope tej Story
- Równoległe wywołania CLI (celowo sekwencyjne)
- Bulk delete stories
- Undo/rollback operacji
- Persystowanie wyników w bazie

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów
- [ ] Endpoint zwraca 200 (nie 500) dla partial failure — odpowiedź zawiera per-story results
- [ ] Wywołania są sekwencyjne z 200ms sleep między nimi
- [ ] Walidacja odrzuca > 20 story IDs i nieznane akcje
- [ ] 401 dla brakującego tokena
- [ ] Timeout 10s per wywołanie CLI
