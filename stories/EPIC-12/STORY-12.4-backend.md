---
story_id: STORY-12.4
title: "Conflict resolution — last-write-wins + sync_log monitoring endpoint"
epic: EPIC-12
module: sync
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: none
api_reference: /api/sync/conflicts
priority: should
estimated_effort: 5h
depends_on: [STORY-12.2]
blocks: []
tags: [conflict, sync, monitoring, last-write-wins, sqlite, supabase, backend]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** żeby konflikty sync były automatycznie rozwiązywane metodą last-write-wins i widoczne w dedykowanym endpoincie
**Żeby** mieć pełen wgląd w problemy synchronizacji i nigdy nie stracić danych po cichu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `sync_to_supabase.js` (funkcje `resolveConflict`, `logConflict`)
- Serwer: `server.cjs` — endpoint `GET /api/sync/conflicts`
- Tabela: `kb_sync_log` w Supabase (STORY-12.1)
- SQLite: `db/kiraboard.db` — tabela `kb_sync_log` (mirror lokalny, opcjonalnie)

### Powiązane pliki
- `sync_to_supabase.js` — sync engine (STORY-12.2)
- `server.cjs` — serwer Express
- `lib/supabase.js` — klient Supabase
- SQLite: tabela `kb_sync_log` lub tylko Supabase `kb_sync_log`

### Stan systemu przed tą story
- Sync engine działa (STORY-12.2) — upsertuje dane do Supabase
- Tabela `kb_sync_log` istnieje w Supabase (STORY-12.1)
- STORY-12.2 loguje podstawowe sukcesy/błędy do `kb_sync_log`
- Ta story dodaje: konflikt detection, resolution logic, monitoring endpoint

---

## ✅ Acceptance Criteria

### AC-1: Conflict detection przy upsert
GIVEN: Rekord w SQLite ma `updated_at = 2026-03-05T20:00:00Z`
AND: Ten sam rekord w Supabase ma `updated_at = 2026-03-05T20:00:05Z` (Supabase nowszy)
WHEN: Sync engine próbuje upsertować rekord do Supabase
THEN: Przed upsert, sync engine pobiera aktualny `updated_at` z Supabase dla tego id
AND: Jeśli Supabase.updated_at > SQLite.updated_at → SKIP upsert (Supabase wygrywa)
AND: Konflikt jest logowany do `kb_sync_log` z `operation='conflict_skipped'`, `status='info'`

### AC-2: Local-first — lokalny rekord wygrywa gdy jest nowszy
GIVEN: Rekord w SQLite ma `updated_at = 2026-03-05T20:05:00Z`
AND: Ten sam rekord w Supabase ma `updated_at = 2026-03-05T20:00:00Z` (SQLite nowszy)
WHEN: Sync engine wykonuje upsert
THEN: Rekord z SQLite nadpisuje Supabase (local-first zasada)
AND: `kb_sync_log` zapisuje `operation='conflict_resolved'`, `status='success'`
AND: `error_message` zawiera: `"local wins: local=2026-03-05T20:05:00Z, remote=2026-03-05T20:00:00Z"`

### AC-3: Alert gdy sync lag > 5 minut
GIVEN: Ostatni udany sync dla dowolnej tabeli był ponad 5 minut temu
WHEN: `GET /api/sync/status` jest wywołany (STORY-12.2 endpoint)
THEN: `status` zmienia się z `"ok"` na `"degraded"`
AND: Odpowiedź zawiera `"alertReason": "Sync lag > 5 minutes for table: kb_tasks"`
AND: `lagSeconds` > 300 jest widoczne w odpowiedzi

### AC-4: Endpoint GET /api/sync/conflicts
GIVEN: Serwer działa
WHEN: `GET /api/sync/conflicts?limit=50&table=kb_shopping_items` jest wywołany
THEN: Odpowiedź 200 z JSON:
```json
{
  "total": 12,
  "conflicts": [
    {
      "id": 45,
      "table_name": "kb_shopping_items",
      "operation": "conflict_resolved",
      "record_id": "abc-123",
      "status": "success",
      "error_message": "local wins: local=2026-03-05T20:05:00Z, remote=2026-03-05T20:00:00Z",
      "synced_at": "2026-03-05T20:05:01Z"
    }
  ],
  "summary": {
    "resolved": 10,
    "skipped": 2,
    "errors": 0
  }
}
```
AND: Parametr `table` filtruje wyniki (opcjonalny)
AND: Parametr `limit` ogranicza wyniki (default: 50, max: 200)
AND: Wyniki posortowane po `synced_at DESC` (najnowsze pierwszne)

### AC-5: Endpoint GET /api/sync/conflicts — filtr po czasie
GIVEN: Endpoint jest dostępny
WHEN: `GET /api/sync/conflicts?since=2026-03-05T00:00:00Z` jest wywołany
THEN: Zwracane są tylko konflikty po podanym timestamp
AND: Format `since` to ISO 8601 — nieprawidłowy format zwraca 400 z komunikatem

### AC-6: Zero cichych błędów — każdy wyjątek logowany
GIVEN: Sync engine wykonuje operację
WHEN: Dowolny błąd (network, parse, constraint violation) wystąpi
THEN: Błąd jest zapisany do `kb_sync_log` z `status='error'` i `error_message` (pełna treść błędu)
AND: Nigdy nie ma `try-catch` bez logu — każdy catch musi logować
AND: Stack trace dostępny w `error_message` (lub osobnym polu)

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**GET /api/sync/conflicts**
Path: `/api/sync/conflicts`
Auth: Brak (monitoring endpoint)
Role: Public (dane techniczne, nie biznesowe)

**Query params:**
```typescript
interface ConflictsQueryParams {
  table?:  string    // filtr po table_name
  since?:  string    // ISO 8601 timestamp
  limit?:  number    // default: 50, max: 200
  status?: 'error' | 'info' | 'success'  // filtr po status
}
```

### Response Schema

```typescript
interface ConflictsResponse {
  total: number
  conflicts: Array<{
    id: number
    table_name: string
    operation: string  // 'conflict_resolved' | 'conflict_skipped' | 'sync_error'
    record_id: string | null
    status: 'success' | 'error' | 'info'
    error_message: string | null
    synced_at: string  // ISO 8601
  }>
  summary: {
    resolved: number
    skipped: number
    errors: number
  }
}
// 400 → nieprawidłowy format `since`
// 500 → błąd zapytania do Supabase
```

### Logika biznesowa conflict resolution (krok po kroku)

```
resolveConflict(localRecord, remoteRecord):
1. Pobierz localRecord.updated_at (SQLite) i remoteRecord.updated_at (Supabase)
2. Parsuj oba jako Date objekty
3. Jeśli localRecord.updated_at > remoteRecord.updated_at:
   → UPSERT localRecord do Supabase
   → logConflict(table, record_id, 'conflict_resolved', 'success', `local wins: local=${local}, remote=${remote}`)
4. Jeśli localRecord.updated_at <= remoteRecord.updated_at:
   → SKIP upsert (nie nadpisuj Supabase)
   → logConflict(table, record_id, 'conflict_skipped', 'info', `remote wins: local=${local}, remote=${remote}`)
5. Zwróć { action: 'upserted' | 'skipped', winner: 'local' | 'remote' }

logConflict(table, recordId, operation, status, message):
1. INSERT INTO kb_sync_log (table_name, operation, record_id, status, error_message, synced_at)
   VALUES (table, recordId, operation, status, message, NOW())
2. Supabase insert — fire-and-forget (nie blokuj sync na log)
3. console.log(`[SyncLog] ${operation} on ${table}:${recordId} — ${message}`)

checkSyncLag():
1. SELECT MAX(synced_at) FROM kb_sync_log WHERE status = 'success' GROUP BY table_name
2. Dla każdej tabeli: lag = NOW() - maxSyncedAt
3. Jeśli lag > 300s → return { degraded: true, table, lagSeconds }
4. Używane przez /api/sync/status (STORY-12.2)
```

---

## ⚠️ Edge Cases

### EC-1: Oba rekordy mają identyczny updated_at (tie)
Scenariusz: Race condition — oba timestamps są identyczne do milisekundy
Oczekiwane zachowanie: Local wins (local-first zasada) — upsert do Supabase; log `operation='conflict_resolved'`, message zawiera `"tie → local wins"`
Komunikat dla użytkownika: Brak

### EC-2: Record nie istnieje w Supabase (pierwsza sync)
Scenariusz: Nowy rekord w SQLite, nie ma go jeszcze w Supabase
Oczekiwane zachowanie: Brak konfliktu — normalny INSERT bez conflict check; log `operation='insert'`, `status='success'`
Komunikat dla użytkownika: Brak

### EC-3: kb_sync_log przepełniony (> 10 000 rekordów)
Scenariusz: Po tygodniach działania tabela ma miliony wpisów
Oczekiwane zachowanie: Cleanup job (weekly cron) — DELETE FROM kb_sync_log WHERE synced_at < NOW() - INTERVAL '7 days'; albo TTL na poziomie Supabase
Komunikat dla użytkownika: Brak (automatyczny cleanup)

### EC-4: updated_at NULL w rekordzie SQLite
Scenariusz: Stary rekord z EPIC-0 nie ma ustawionego `updated_at`
Oczekiwane zachowanie: Traktuj jako `updated_at = '1970-01-01'` (zawsze przegrywa) — remote wins; log `operation='conflict_skipped'`, message `"local updated_at null → remote wins"`
Komunikat dla użytkownika: Brak

### EC-5: Supabase timeout podczas pobierania remote record dla conflict check
Scenariusz: SELECT z Supabase dla conflict check przekracza timeout (>5s)
Oczekiwane zachowanie: Fallback — upsert bez conflict check (zakładamy local wygrywa); log `operation='conflict_check_failed'`, `status='error'`
Komunikat dla użytkownika: Brak

---

## 🚫 Out of Scope tej Story
- UI do przeglądania konfliktów (tabela w Settings/Admin — przyszły epic)
- Alerting push (SMS/email gdy lag > 5min) — poza zakresem
- Reverse sync (Supabase → SQLite) gdy remote rekord wygrywa — EPIC-12 out of scope
- Per-field merge resolution (tylko whole-record last-write-wins)
- Archiwizacja `kb_sync_log` (przyszły epic, cleanup cron to minimum)

---

## ✔️ Definition of Done
- [ ] `resolveConflict()` porównuje `updated_at` i decyduje local/remote wins
- [ ] Local-first: lokalny rekord wygrywa gdy jest nowszy lub równy
- [ ] Każdy konflikt zapisany do `kb_sync_log` z pełnym opisem
- [ ] Zero cichych błędów — każdy `catch` loguje do `kb_sync_log`
- [ ] `GET /api/sync/conflicts` zwraca JSON z filtrowaniem i paginacją
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem po polsku
- [ ] Endpoint nie crashuje na pustej bazie (empty `conflicts: []`)
- [ ] `checkSyncLag()` poprawnie wykrywa lag > 5 minut → `status: "degraded"`
- [ ] Cleanup logów: stare wpisy (> 7 dni) usuwane automatycznie (cron lub Supabase TTL)
- [ ] Story review przez PO
