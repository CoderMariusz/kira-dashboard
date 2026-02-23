---
story_id: STORY-5.9
title: "Hybrid Mode — sync script SQLite→Supabase + fallback API routes"
epic: EPIC-5
module: sync
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-5.8]
blocks: []
tags: [python, sync, supabase, sqlite, api, fallback, hybrid, vercel, pipeline]
---

## 🎯 User Story

**Jako** developer pracujący z pipeline Kira
**Chcę** żeby dashboard działał zarówno w domu (Bridge online) jak i poza domem (Vercel bez Bridge)
**Żeby** móc sprawdzić status pipeline z telefonu/laptopa bez potrzeby bycia w domu

---

## 📐 Kontekst implementacyjny

### Architektura Hybrid Mode

```
┌─────────────────────────────────────────────────────┐
│  W DOMU (npm run dev / localhost)                   │
│  Dashboard → Bridge API (localhost:8199) → SQLite   │
│  Real-time, mutacje działają (start/advance story)  │
└─────────────────────────────────────────────────────┘
          ↕ sync script co 5 min
┌─────────────────────────────────────────────────────┐
│  POZA DOMEM (Vercel / produkcja)                    │
│  Dashboard → /api/sync/* → Supabase (bridge_*)      │
│  Read-only, dane max 5 min stare                    │
└─────────────────────────────────────────────────────┘
```

### Gdzie w systemie

```
# Python sync script (w repo kira, nie kira-dashboard)
kira/scripts/sync_bridge_to_supabase.py     → główny skrypt sync

# Next.js API routes (kira-dashboard) — read-only z Supabase
app/api/sync/status/route.ts                → GET /api/sync/status (epics + stories)
app/api/sync/runs/route.ts                  → GET /api/sync/runs (historia runów)

# Hook wiring
hooks/usePipeline.ts                        → UPDATE (dodaj fallback do /api/sync/*)
hooks/useLivePipeline.ts                    → UPDATE (dodaj fallback gdy bridge offline)
```

### Wykrywanie trybu (Bridge online vs offline)

Sposób detekcji w Next.js API routes:
```typescript
// lib/bridge.ts już eksportuje fetchBridge() → null gdy offline
// Dodajemy helper:
export async function isBridgeOnline(): Promise<boolean> {
  const result = await fetchBridge<{ status: string }>('/api/health')
  return result !== null
}
```

W hookach frontendowych:
```typescript
// NEXT_PUBLIC_BRIDGE_MODE='offline' na Vercel → wymusza tryb Supabase
// Gdy nie ustawiony → auto-detect (próbuj bridge, fallback do sync)
const isOfflineMode = process.env.NEXT_PUBLIC_BRIDGE_MODE === 'offline'
```

### Sync script — technologia

- **Python 3.14** (ten sam co bridge)
- **sqlite3** (stdlib) — czyta `data/bridge.db`
- **httpx** lub **requests** — upsert do Supabase REST API
- Używa `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (service role — może pisać mimo RLS)
- Uruchamiany lokalnie jako cron lub ręcznie

---

## ✅ Acceptance Criteria

### AC-1: Sync script synchronizuje projekty

GIVEN: `data/bridge.db` istnieje z wierszami w tabeli `projects`
WHEN: `python scripts/sync_bridge_to_supabase.py` uruchomiony
THEN: wszystkie wiersze z `projects` pojawiają się w `bridge_projects` w Supabase
AND: script wypisuje: `✅ Synced N projects`
AND: ponowne uruchomienie (upsert) nie duplikuje danych

### AC-2: Sync script synchronizuje epics

GIVEN: `data/bridge.db` zawiera epics dla projektu `kira`
WHEN: script uruchomiony
THEN: wszystkie epics pojawiają się w `bridge_epics`
AND: script wypisuje: `✅ Synced N epics`
AND: pola `depends_on`, `parallel_with` (JSON strings w SQLite) zapisane jako JSONB

### AC-3: Sync script synchronizuje stories

GIVEN: `data/bridge.db` zawiera stories w różnych statusach
WHEN: script uruchomiony
THEN: wszystkie stories pojawiają się w `bridge_stories`
AND: script wypisuje: `✅ Synced N stories`
AND: timestamps (TEXT w SQLite) prawidłowo skonwertowane na TIMESTAMPTZ
AND: puste stringi (`""`) w opcjonalnych polach zapisane jako NULL

### AC-4: Sync script synchronizuje runs

GIVEN: `data/bridge.db` zawiera runs z ostatnich 30 dni
WHEN: script uruchomiony
THEN: runs z ostatnich 30 dni pojawiają się w `bridge_runs`
AND: script wypisuje: `✅ Synced N runs (last 30 days)`
AND: starsze runs są pomijane (performance — nie sync'ujemy historii > 30 dni)

### AC-5: Sync script obsługuje błędy gracefully

GIVEN: Supabase jest niedostępny (timeout)
WHEN: script próbuje upsert
THEN: script wypisuje błąd z detalami i kończy z exit code 1
AND: nie crashuje bez informacji

GIVEN: `data/bridge.db` nie istnieje
WHEN: script uruchomiony
THEN: script wypisuje: `❌ Bridge DB not found: data/bridge.db` i kończy z exit code 1

### AC-6: GET /api/sync/status zwraca epics + stories z Supabase

GIVEN: ADMIN zalogowany na Vercel (bridge offline)
WHEN: `GET /api/sync/status` wywołany
THEN: HTTP 200 z body:
```json
{
  "source": "supabase",
  "synced_at": "2026-02-23T10:00:00Z",
  "projects": [...],
  "epics": [
    {
      "project_id": "kira",
      "id": "EPIC-1",
      "title": "...",
      "status": "DONE",
      "stories": [
        { "id": "STORY-1.1", "title": "...", "status": "DONE", "model": "sonnet", ... }
      ]
    }
  ]
}
```
AND: `source: "supabase"` w odpowiedzi — frontend może wyświetlić badge "offline mode"

### AC-7: GET /api/sync/status zwraca 401 dla non-ADMIN

GIVEN: użytkownik bez roli ADMIN
WHEN: `GET /api/sync/status`
THEN: HTTP 401 `{ "error": "Brak dostępu. Wymagana rola ADMIN." }`

### AC-8: GET /api/sync/runs zwraca historię runów z Supabase

GIVEN: ADMIN zalogowany, bridge offline
WHEN: `GET /api/sync/runs?project=kira&limit=50`
THEN: HTTP 200 z tablicą ostatnich runów z `bridge_runs`
AND: posortowane `started_at DESC`
AND: max `limit` wyników (default 50, max 200)

### AC-9: usePipeline hook — auto-fallback gdy bridge offline

GIVEN: aplikacja działa na Vercel (`NEXT_PUBLIC_BRIDGE_MODE=offline`)
WHEN: hook `usePipeline()` jest wywołany
THEN: hook pobiera dane z `/api/sync/status` zamiast `/api/bridge/status`
AND: dane mają ten sam shape co pipeline data z Bridge (backward compatible)
AND: hook zwraca `{ isOfflineMode: true }` — UI może wyświetlić banner

GIVEN: aplikacja działa lokalnie, bridge online
WHEN: hook `usePipeline()` jest wywołany
THEN: hook pobiera dane z Bridge (zachowanie bez zmian)

### AC-10: Banner "Offline Mode" w UI

GIVEN: `isOfflineMode: true` zwrócone przez hook
WHEN: użytkownik jest na `/dashboard`
THEN: wyświetla się żółty banner:
```
⚠️ Tryb offline — dane z ostatniej synchronizacji (DD.MM.YYYY HH:MM)
```
AND: banner nie pojawia się gdy bridge jest online

### AC-11: Dokumentacja uruchamiania sync

GIVEN: plik `kira/scripts/sync_bridge_to_supabase.py`
THEN: istnieje docstring/komentarz z instrukcją uruchomienia:
```
# Użycie:
#   cd /Users/mariuszkrawczyk/codermariusz/kira
#   source .venv/bin/activate
#   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=... python scripts/sync_bridge_to_supabase.py
#
# Lub z .env:
#   python scripts/sync_bridge_to_supabase.py --env .env.supabase
#
# Cron (co 5 min):
#   */5 * * * * cd /path/to/kira && source .venv/bin/activate && python scripts/sync_bridge_to_supabase.py >> /tmp/kira-sync.log 2>&1
```

### AC-12: Env var NEXT_PUBLIC_BRIDGE_MODE dodany do Vercel

GIVEN: deploy na Vercel
THEN: `NEXT_PUBLIC_BRIDGE_MODE=offline` ustawiony w Vercel environment (production + preview)
AND: `.env.local` ma `NEXT_PUBLIC_BRIDGE_MODE=` (puste — lokalnie auto-detect)

---

## 🚫 Edge Cases

### EC-1: Bridge online ale Vercel nie może go osiągnąć
- Zawsze wymuszaj `NEXT_PUBLIC_BRIDGE_MODE=offline` na Vercel
- Nie próbuj auto-detect z Vercel (zawsze timeout → wolne UX)
- Auto-detect tylko lokalnie gdy env var nie ustawiony

### EC-2: Dane sync nieaktualne > 30 min
- `synced_at` w odpowiedzi API — frontend może wyświetlić ostrzeżenie
- Banner zmienia kolor: żółty (<30min), pomarańczowy (30-60min), czerwony (>60min)

### EC-3: Upsert conflict — story zmieniła status między sync'ami
- Używaj `ON CONFLICT (project_id, id) DO UPDATE SET ...` — zawsze nadpisuj
- `synced_at` aktualizowane przy każdym sync

### EC-4: bridge_projects foreign key dla epics bez projektu
- Projekt musi istnieć przed epikiem (sync kolejność: projects → epics → stories → runs)
- Script sync'uje w tej kolejności

### EC-5: JSON parse error w `depends_on`
- SQLite może mieć `""` lub `"null"` zamiast `"[]"` 
- Normalizuj: `if not val or val in ('', 'null', 'NULL'): val = '[]'`

### EC-6: Wielkie projekty (wiele historycznych runów)
- Runs: limit 30 dni ALWAYS — nie sync'uj całej historii
- Przy pierwszym sync może być dużo runs — skrypt powinien robić batch insert (po 100)

---

## 🔧 Implementacja sync script — pseudokod

```python
#!/usr/bin/env python3
"""
sync_bridge_to_supabase.py — synchronizuje dane Bridge (SQLite) do Supabase
"""
import sqlite3, json, httpx, os
from datetime import datetime, timedelta, timezone

BRIDGE_DB = "data/bridge.db"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
CUTOFF = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

def supabase_upsert(table: str, rows: list[dict]) -> None:
    """Batch upsert do Supabase REST API."""
    if not rows:
        return
    # Batch po 100
    for i in range(0, len(rows), 100):
        batch = rows[i:i+100]
        r = httpx.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={
                "Authorization": f"Bearer {SERVICE_KEY}",
                "apikey": SERVICE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            json=batch,
        )
        r.raise_for_status()

def normalize_ts(val: str | None) -> str | None:
    """SQLite TEXT timestamp → ISO format lub None."""
    if not val or val == "":
        return None
    return val  # już ISO format

def normalize_json(val: str | None) -> list:
    """SQLite JSON string → Python list."""
    if not val or val in ("", "null", "NULL"):
        return []
    try:
        return json.loads(val)
    except Exception:
        return []

def sync():
    con = sqlite3.connect(BRIDGE_DB)
    con.row_factory = sqlite3.Row
    now = datetime.now(timezone.utc).isoformat()
    
    # 1. Projects
    rows = [dict(r) | {"synced_at": now} for r in con.execute("SELECT * FROM projects")]
    supabase_upsert("bridge_projects", rows)
    print(f"✅ Synced {len(rows)} projects")
    
    # 2. Epics
    rows = [dict(r) | {"synced_at": now} for r in con.execute("SELECT * FROM epics")]
    supabase_upsert("bridge_epics", rows)
    print(f"✅ Synced {len(rows)} epics")
    
    # 3. Stories
    raw = con.execute("SELECT * FROM stories").fetchall()
    rows = []
    for r in raw:
        d = dict(r)
        d["depends_on"] = normalize_json(d.get("depends_on"))
        d["parallel_with"] = normalize_json(d.get("parallel_with"))
        for field in ("assigned_worker", "branch", "model", "merge_commit"):
            if d.get(field) == "":
                d[field] = None
        d["synced_at"] = now
        rows.append(d)
    supabase_upsert("bridge_stories", rows)
    print(f"✅ Synced {len(rows)} stories")
    
    # 4. Runs (ostatnie 30 dni)
    raw = con.execute(
        "SELECT * FROM runs WHERE started_at >= ?", (CUTOFF,)
    ).fetchall()
    rows = [dict(r) | {"synced_at": now} for r in raw]
    supabase_upsert("bridge_runs", rows)
    print(f"✅ Synced {len(rows)} runs (last 30 days)")
    
    con.close()
    print(f"🎉 Sync complete at {now}")

if __name__ == "__main__":
    sync()
```

---

## 📋 Definition of Done

- [ ] `kira/scripts/sync_bridge_to_supabase.py` stworzony i działa
- [ ] Ręczne uruchomienie skryptu synchronizuje dane do Supabase (weryfikacja w Dashboard)
- [ ] `GET /api/sync/status` zwraca 200 z danymi epics+stories
- [ ] `GET /api/sync/runs` zwraca 200 z historią runów
- [ ] `usePipeline` hook ma działający fallback do `/api/sync/status`
- [ ] Banner "Offline Mode" z `synced_at` wyświetla się gdy `NEXT_PUBLIC_BRIDGE_MODE=offline`
- [ ] `NEXT_PUBLIC_BRIDGE_MODE=offline` ustawiony w Vercel production+preview
- [ ] Commit w kira-dashboard: `feat(sync): hybrid mode — Supabase fallback — STORY-5.9`
- [ ] Commit w kira: `feat: sync_bridge_to_supabase.py script — STORY-5.9`

---

## 🔗 Zależności i kolejność

```
STORY-5.8 (database: tabele w Supabase)
    ↓
STORY-5.9 (backend: sync script + API routes + hook fallback)
```

Można implementować równolegle z STORY-5.1–5.7, ale STORY-5.8 musi być DONE przed STORY-5.9.

**Zalecana kolejność EPIC-5:**
```
Wave 1 (parallel): 5.1, 5.2, 5.3, 5.8
Wave 2 (parallel): 5.4, 5.9
Wave 3 (parallel): 5.5, 5.6, 5.7
```
