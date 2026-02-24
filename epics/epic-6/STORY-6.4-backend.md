---
story_id: STORY-6.4
title: "GET /api/projects/stats — statystyki per projekt z Bridge CLI"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: moderate
recommended_model: glm-5
priority: must
estimated_effort: 4h
depends_on: none
blocks: [STORY-6.5, STORY-6.7]
tags: [api, bridge-cli, projects, stats, aggregation, next.js, typescript]
---

## 🎯 User Story

**Jako** aplikacja frontendowa kira-dashboard
**Chcę** endpoint `GET /api/projects/stats` który agreguje statystyki wszystkich projektów z Bridge CLI
**Żeby** project switcher w nagłówku Pipeline mógł pokazać completion %, liczniki stories i aktywny projekt dla każdego projektu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
app/api/projects/stats/route.ts  → eksportuj GET
```

Stack:
- Next.js 16 App Router, `export const runtime = 'nodejs'`
- `child_process.execSync` — Bridge CLI z JSON output
- `requireAdmin()` z `lib/utils/require-admin.ts`
- `Cache-Control: s-maxage=30, stale-while-revalidate=60`

### Powiązane pliki
- `lib/utils/require-admin.ts`
- Istniejące Bridge CLI patterns (patrz STORY-6.3 dla wzorca execSync)

### Stan systemu przed tą story
- Bridge CLI ma komendę `projects list --format json`
- Bridge CLI ma komendę `status --project <key> --format json`
- Projekt `kira-dashboard` istnieje w Bridge

---

## ✅ Acceptance Criteria

### AC-1: Zwraca stats dla wszystkich projektów — happy path
GIVEN: zalogowany admin, Bridge CLI dostępny z min 1 projektem
WHEN: `GET /api/projects/stats` jest wywołany
THEN: zwrócone jest `200 OK` z `{ projects: [...], fetched_at: "ISO string" }`
AND: każdy projekt ma: `key`, `name`, `is_current` (bool), `total`, `done`, `in_progress`, `review`, `blocked`, `completion_pct` (zaokrąglone do 1 decimal)
AND: nagłówek `Cache-Control: s-maxage=30, stale-while-revalidate=60` jest obecny

### AC-2: Bridge offline — graceful fallback
GIVEN: Bridge CLI niedostępne (`NEXT_PUBLIC_BRIDGE_MODE === 'offline'`)
WHEN: `GET /api/projects/stats` jest wywołany
THEN: zwrócone jest `200 OK` z `{ projects: [], fetched_at: "...", offline: true }`
AND: brak błędu 500

### AC-3: completion_pct obliczane poprawnie
GIVEN: projekt z total=8 stories, done=6
WHEN: endpoint agreguje stats
THEN: `completion_pct = 75.0` (zaokrąglone do 1 decimal)

### AC-4: Projekt z 0 stories
GIVEN: projekt zarejestrowany ale bez żadnych stories
WHEN: endpoint agreguje jego stats
THEN: `total=0, done=0, completion_pct=0`, projekt jest zawarty w response

### AC-5: Auth check
GIVEN: request bez tokena JWT
WHEN: `GET /api/projects/stats` jest wywołany
THEN: endpoint zwraca `401 Unauthorized`

---

## ⚙️ Szczegóły Backend

### Endpoint
```
METHOD: GET
Path:   /api/projects/stats
Auth:   Supabase JWT (requireAdmin)
Role:   ADMIN
Cache:  s-maxage=30, stale-while-revalidate=60
```

### Response Schema
```typescript
// 200 OK
interface SuccessResponse {
  projects: Array<{
    key: string
    name: string
    is_current: boolean
    total: number
    done: number
    in_progress: number
    review: number
    blocked: number
    completion_pct: number   // done/total*100, zaokrąglone do 1dp; 0 gdy total=0
  }>
  fetched_at: string   // new Date().toISOString()
  offline?: boolean    // true gdy Bridge niedostępny
}
```

### Logika biznesowa (krok po kroku)
```
1. requireAdmin() → 401
2. Sprawdź NEXT_PUBLIC_BRIDGE_MODE === 'offline' → zwróć { projects: [], fetched_at, offline: true }
3. Wywołaj: execSync(`bridge.cli projects list --format json`, { timeout: 10_000 })
   → Parsuj JSON → lista projektów [{key, name}, ...]
   → błąd? zwróć { projects: [], fetched_at, offline: true } (graceful)
4. Wywołaj: execSync(`bridge.cli projects current`, { timeout: 5_000 })
   → Wyciągnij current project key ze stdout (trim)
   → błąd? current = null
5. Dla każdego projektu (sekwencyjnie):
   a. execSync(`bridge.cli status --project {key} --format json`, { timeout: 15_000 })
   b. Parsuj JSON → wyciągnij story counts:
      - total: liczba wszystkich stories
      - done: status === 'DONE'
      - in_progress: status === 'IN_PROGRESS'
      - review: status === 'REVIEW'
      - blocked: status === 'BLOCKED'
   c. completion_pct = total > 0 ? Math.round((done/total) * 1000) / 10 : 0
   d. Zbierz stats
6. Zwróć 200 z { projects, fetched_at: new Date().toISOString() }
   + nagłówek Cache-Control
```

### Bridge CLI output format (oczekiwany)
```json
// bridge.cli projects list --format json
[
  { "key": "kira-dashboard", "name": "Kira Dashboard" },
  { "key": "kira", "name": "Kira Core" }
]

// bridge.cli status --project kira-dashboard --format json
{
  "stories": [
    { "id": "STORY-1.1", "status": "DONE", ... },
    { "id": "STORY-1.2", "status": "IN_PROGRESS", ... }
  ]
}
```

Jeśli Bridge CLI nie obsługuje `--format json` dla `status`: parsuj text output (grep linii ze statusami).
Dodaj fallback: jeśli JSON parse fails → parsuj plain text.

---

## ⚠️ Edge Cases

### EC-1: Bridge CLI zwraca puste `projects list`
Scenariusz: Brak projektów zarejestrowanych
Oczekiwane zachowanie: `{ projects: [], fetched_at }` — 200, bez błędu

### EC-2: Timeout podczas pobierania stats projektu
Scenariusz: Jeden projekt ma bardzo dużo stories, CLI wisi >15s
Oczekiwane zachowanie: złap ETIMEDOUT dla tego projektu, dodaj go do listy z `total: 0, completion_pct: 0, error: "timeout"` (lub pomiń), kontynuuj dla pozostałych

### EC-3: `bridge.cli projects current` zwraca pusty string
Scenariusz: Brak aktywnego projektu
Oczekiwane zachowanie: `is_current = false` dla wszystkich projektów; nie crashuj

---

## 🚫 Out of Scope tej Story
- Zmiana aktywnego projektu (to POST /api/projects/switch, istniejący endpoint)
- Persystowanie stats w bazie
- Realtime update stats przez SSE

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów
- [ ] Nagłówek `Cache-Control: s-maxage=30, stale-while-revalidate=60` w response
- [ ] Tryb offline zwraca `{ projects: [], offline: true }` bez błędu 500
- [ ] `completion_pct` obliczone poprawnie (0 gdy total=0, zaokrąglone do 1dp)
- [ ] 401 dla brakującego tokena
- [ ] Timeout 15s per projekt nie crashuje całego endpointu
