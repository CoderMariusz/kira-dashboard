---
story_id: STORY-12.2
title: "Sync engine — pełny Bridge sync (stories/runs/digests) + endpoint status"
epic: EPIC-12
module: sync
domain: backend
status: draft
difficulty: complex
recommended_model: codex-5.3
ux_reference: none
api_reference: /api/sync/status
priority: must
estimated_effort: 10h
depends_on: [STORY-12.1]
blocks: [STORY-12.4, STORY-12.5]
tags: [sync, bridge, supabase, cron, upsert, node-cron, backend]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** żeby `sync_to_supabase.js` automatycznie synchronizował Bridge data (stories, runs, digests) do Supabase co 60 sekund
**Żeby** dane Pipeline były dostępne zdalnie nawet gdy Bridge jest offline, a endpoint `/api/sync/status` pokazywał zdrowie sync

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `sync_to_supabase.js` (root lub `lib/sync/`)
- Serwer: `server.cjs` — cron job wywołujący sync co 60s
- Endpoint: `GET /api/sync/status` w `server.cjs`
- Supabase tabele: `bridge_stories`, `bridge_runs`, `nightclaw_digests`, `kb_tasks`, `kb_shopping_items`, `kb_kanban_cards`, `kb_sync_log`

### Powiązane pliki
- `sync_to_supabase.js` — skeleton z EPIC-0 (rozszerzamy)
- `server.cjs` — główny serwer Express
- `lib/supabase.ts` lub `lib/supabase.js` — klient Supabase
- `bridge.yml` — config Bridge (project_key)
- SQLite: `db/kiraboard.db` (STORY-0.3)

### Stan systemu przed tą story
- Supabase tabele istnieją (STORY-12.1)
- `sync_to_supabase.js` ma skeleton — synchronizuje tylko kb_shopping_items i kb_tasks (EPIC-0)
- Bridge API dostępne lokalnie na porcie skonfigurowanym w bridge.yml
- `node-cron` jest zainstalowany lub dostępny

---

## ✅ Acceptance Criteria

### AC-1: Sync Bridge stories co 60 sekund
GIVEN: Bridge jest lokalnie dostępny (`GET /api/bridge/status` zwraca 200)
WHEN: Cron job odpala się po 60 sekundach od poprzedniego sync
THEN: Sync engine pobiera `GET /api/bridge/status/stories?project=kira-dashboard`
AND: Upsertuje wyniki do tabeli `bridge_stories` w Supabase z compound key `(id, project_key)`
AND: Zapisuje wynik w `kb_sync_log` z `status='success'` i `table_name='bridge_stories'`

### AC-2: Sync Bridge runs
GIVEN: Bridge jest dostępny i ma historię runs
WHEN: Sync engine wykonuje sync
THEN: `GET /api/bridge/status/runs` jest wywołany
AND: Wyniki są upsertowane do `bridge_runs` z PRIMARY KEY `(id, project_key)`
AND: Runs starsze niż 30 dni są pomijane (archiwizacja, nie duplikowanie)

### AC-3: Sync NightClaw digests
GIVEN: Pliki `.md` z NightClaw digestami istnieją w katalogu konfiguracyjnym
WHEN: Sync engine wykonuje sync
THEN: Pliki są odczytywane i upsertowane do `nightclaw_digests` z kluczem `run_date`
AND: `patterns_found_count` i `skills_updated` są parsowane z treści pliku
AND: Istniejący digest dla tego samego `run_date` jest nadpisywany (upsert)

### AC-4: Sync tabel kb_* z SQLite
GIVEN: Lokalna SQLite baza ma rekordy w kb_shopping_items lub kb_tasks
WHEN: Sync engine sprawdza `updated_at` > `synced_at` (lub `synced_at IS NULL`)
THEN: Zmodyfikowane rekordy są upsertowane do Supabase
AND: Po udanym upsert, `synced_at` w SQLite jest aktualizowany na `NOW()`
AND: Sync jest inkrementalny — wysyłane tylko zmienione rekordy

### AC-5: Endpoint GET /api/sync/status
GIVEN: Serwer działa
WHEN: `GET /api/sync/status` jest wywołany (bez auth — monitoring endpoint)
THEN: Odpowiedź 200 z JSON:
```json
{
  "status": "ok" | "degraded" | "error",
  "lastSync": {
    "bridge_stories": "2026-03-05T20:00:00Z",
    "bridge_runs": "2026-03-05T20:00:00Z",
    "nightclaw_digests": "2026-03-05T19:00:00Z",
    "kb_shopping_items": "2026-03-05T20:00:05Z",
    "kb_tasks": "2026-03-05T20:00:05Z"
  },
  "recordsSynced": {
    "bridge_stories": 42,
    "bridge_runs": 156,
    "nightclaw_digests": 7
  },
  "errors": [],
  "lagSeconds": 45
}
```
AND: `lagSeconds` to liczba sekund od ostatniego udanego sync (dowolnej tabeli)
AND: `status: "degraded"` gdy lagSeconds > 300 (5 minut), `status: "error"` gdy > 600

### AC-6: Obsługa błędów i logging
GIVEN: Bridge jest offline lub Supabase zwraca błąd
WHEN: Sync engine próbuje wykonać sync
THEN: Błąd jest logowany do `kb_sync_log` z `status='error'` i `error_message` (treść błędu)
AND: Sync kontynuuje dla pozostałych tabel (jeden błąd nie zatrzymuje całości)
AND: `console.error` loguje błąd z timestampem i nazwą tabeli

### AC-7: Conflict resolution last-write-wins
GIVEN: Rekord w SQLite i Supabase ma różny `updated_at`
WHEN: Sync engine porównuje timestamps
THEN: Rekord z nowszym `updated_at` wygrywa i nadpisuje drugi
AND: Konflikt jest logowany w `kb_sync_log` z `operation='conflict_resolved'`

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**GET /api/sync/status**
Path: `/api/sync/status`
Auth: Brak (monitoring endpoint, dane nieosobowe)
Role: Public

### Response Schema

```typescript
interface SyncStatusResponse {
  status: 'ok' | 'degraded' | 'error'
  lastSync: Record<string, string | null>  // table → ISO timestamp
  recordsSynced: Record<string, number>    // table → count
  errors: Array<{
    table: string
    message: string
    timestamp: string
  }>
  lagSeconds: number
}
```

### Logika biznesowa sync engine (krok po kroku)

```
SyncEngine.run():
1. Dla każdej tabeli kb_* (shopping, tasks, kanban, recurring, gates, settings, presets):
   a. SELECT z SQLite WHERE updated_at > synced_at OR synced_at IS NULL LIMIT 500
   b. Jeśli pusto → skip (inkrementalny)
   c. UPSERT do Supabase (batch, max 100 rekordów per request)
   d. UPDATE SQLite SET synced_at=NOW() WHERE id IN (upserted_ids)
   e. Log do kb_sync_log (status=success/error)

2. Pobierz Bridge stories (GET /api/bridge/status/stories?all=true):
   a. Jeśli Bridge offline → log error, skip
   b. Map response → bridge_stories schema z project_key='kira-dashboard'
   c. UPSERT do Supabase (ON CONFLICT (id, project_key) DO UPDATE)
   d. Log do kb_sync_log

3. Pobierz Bridge runs (GET /api/bridge/status/runs?days=30):
   a. Analogicznie jak stories
   b. Filter: tylko runs z ostatnich 30 dni

4. Skanuj NightClaw digest pliki:
   a. Odczytaj pliki z ~/.openclaw/workspace/memory/nightclaw-*.md (lub konfigurowalna ścieżka)
   b. Parsuj frontmatter → run_date, status, patterns_found_count
   c. UPSERT do nightclaw_digests (ON CONFLICT run_date DO UPDATE)

5. Aktualizuj wewnętrzny state lastSyncTimestamps[table] = NOW()
6. Zwróć SyncResult {success, errors, duration}
```

### Konfiguracja cron
```
// W server.cjs:
// node-cron: '*/60 * * * * *' — co 60 sekund
// Pierwsze uruchomienie: immediate po starcie serwera
// Retry: brak automatycznego — kolejny cykl za 60s
```

---

## ⚠️ Edge Cases

### EC-1: Bridge niedostępny (offline, restartuje)
Scenariusz: `GET /api/bridge/status/stories` zwraca ECONNREFUSED lub timeout
Oczekiwane zachowanie: Sync engine loguje błąd do `kb_sync_log`, kontynuuje sync tabel kb_* z SQLite, nie crasha całego procesu
Komunikat dla użytkownika: `/api/sync/status` zwraca `status: "degraded"` z `errors: [{table: "bridge_stories", message: "Bridge offline"}]`

### EC-2: Supabase niedostępny podczas sync
Scenariusz: Supabase zwraca 503 lub timeout podczas upsert
Oczekiwane zachowanie: SQLite `synced_at` NIE jest aktualizowane (dane nie zostały usynced), błąd logowany, retry w kolejnym cyklu
Komunikat dla użytkownika: `/api/sync/status` zwraca `status: "error"` gdy lag > 600s

### EC-3: Batch >500 rekordów do sync
Scenariusz: Pierwsza synchronizacja — wszystkie rekordy mają `synced_at IS NULL`
Oczekiwane zachowanie: Sync engine dzieli na batch po 100 rekordów, wysyła sekwencyjnie, każdy batch osobno logowany
Komunikat dla użytkownika: Brak — proces transparentny, może potrwać dłużej

### EC-4: NightClaw plik uszkodzony lub bez frontmattera
Scenariusz: Plik `nightclaw-2026-03-01.md` nie ma frontmattera lub ma nieprawidłowy format daty
Oczekiwane zachowanie: Plik jest pomijany z logiem `operation='parse_error'`, pozostałe pliki są synkowane
Komunikat dla użytkownika: Brak (log tylko do `kb_sync_log`)

### EC-5: Conflict timestamp — SQLite nowszy niż Supabase
Scenariusz: Rekord zmieniony lokalnie ale Supabase ma nowszą wersję (np. race condition)
Oczekiwane zachowanie: `updated_at` lokalny > Supabase? → upsert lokalnego. `updated_at` lokalny < Supabase? → skip + log `conflict_resolved`
Komunikat dla użytkownika: Brak

### EC-6: project_key collision — inne projekty Bridge
Scenariusz: Bridge ma stories dla projektu `gym-tracker` i `kira-dashboard`
Oczekiwane zachowanie: Compound key `(id, project_key)` zapobiega kolizjom — każdy projekt ma swój namespace
Komunikat dla użytkownika: Brak

---

## 🚫 Out of Scope tej Story
- Bi-directional sync (Supabase → SQLite) — patrz EPIC-12 out of scope
- Sync w czasie rzeczywistym (Realtime) — STORY-12.3
- Conflict resolution UI — dane logowane w `kb_sync_log`, nie pokazywane userowi
- Monitoring alerting (SMS/email gdy lag > 5min) — poza zakresem

---

## ✔️ Definition of Done
- [ ] `sync_to_supabase.js` synchronizuje bridge_stories, bridge_runs, nightclaw_digests i tabele kb_*
- [ ] Cron job odpala sync co 60 sekund po starcie serwera
- [ ] Pierwszy sync odpala się natychmiast po starcie
- [ ] Sync jest inkrementalny — tylko zmienione rekordy (updated_at > synced_at)
- [ ] Batch size: max 100 rekordów per Supabase request
- [ ] `GET /api/sync/status` zwraca poprawny JSON z lagSeconds i statusem
- [ ] Wszystkie błędy zapisywane do `kb_sync_log`
- [ ] Jeden błąd tabeli nie zatrzymuje sync pozostałych tabel
- [ ] `synced_at` w SQLite aktualizowane tylko po udanym upsert do Supabase
- [ ] Conflict resolution: last-write-wins z logiem
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza
- [ ] Brak crashy serwera przy Bridge offline
- [ ] Story review przez PO
