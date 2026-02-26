---
story_id: STORY-12.4
title: "Developer rozszerza sync_bridge_to_supabase.py o stories i epics"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: STORY-12.1
blocks: STORY-12.7, STORY-12.8
tags: [sync, bridge, supabase, python, pipeline]
---

## 🎯 User Story

**Jako** system (cron co 5 min)
**Chcę** żeby stories i epics z Bridge SQLite były automatycznie synchronizowane do Supabase
**Żeby** dashboard na Vercelu widział aktualny stan pipeline w czasie quasi-rzeczywistym

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`/Users/mariuszkrawczyk/codermariusz/kira/scripts/sync_bridge_to_supabase.py`

Plik już istnieje — rozszerzamy go o sekcje stories i epics (aktualnie syncuje tylko runs).

### Powiązane pliki
- `data/bridge.db` — źródło danych (SQLite)
- `bridge.yml` — konfiguracja Bridge
- Cron: `sync-bridge-to-supabase` (co 5 min, już skonfigurowany)

### Stan systemu przed tą story
- STORY-12.1 DONE — tabele `bridge_stories`, `bridge_epics` istnieją w Supabase
- Skrypt syncuje już `bridge_runs` — użyj tego samego wzorca

---

## ✅ Acceptance Criteria

### AC-1: Skrypt syncuje stories do Supabase
GIVEN: `bridge.db` zawiera stories projektu `kira-dashboard`
WHEN: `python scripts/sync_bridge_to_supabase.py` uruchomiony
THEN: wszystkie stories z `kira-dashboard` są w `bridge_stories` z poprawnym statusem

### AC-2: Sync używa upsert (bezpieczny przy wielokrotnym uruchomieniu)
GIVEN: story już istnieje w `bridge_stories`
WHEN: sync uruchomiony ponownie
THEN: rekord aktualizowany (`ON CONFLICT DO UPDATE`), nie duplikowany

### AC-3: Epics syncowane z obliczonymi statystykami
GIVEN: `bridge.db` zawiera epics i powiązane stories
WHEN: sync uruchomiony
THEN: `bridge_epics.done_stories` = liczba stories o statusie DONE, `total_stories` = wszystkie

### AC-4: Sync filtruje po project_id
GIVEN: `bridge.db` zawiera projekty `kira-dashboard` i `kira` (bridge)
WHEN: sync uruchomiony
THEN: syncowane tylko rekordy z `project_id = 'kira-dashboard'`

### AC-5: Błąd połączenia z Supabase nie crashuje Bridge
GIVEN: Supabase niedostępny (sieć, limit API)
WHEN: sync script uruchomiony
THEN: skrypt loguje błąd i kończy z exit code 1, NIE rzuca wyjątkiem do crona — cron retry

### AC-6: Czas sync < 10 sekund dla 100 stories
GIVEN: `bridge.db` z 100 stories i 15 epics
WHEN: sync uruchomiony
THEN: całość kończy się w < 10 sekund (batch upsert, nie 1-po-1)

---

## ⚙️ Szczegóły Backend

### Rozszerzenie skryptu — nowe sekcje

```python
# scripts/sync_bridge_to_supabase.py — NOWE sekcje do dodania

import sqlite3
import os
from supabase import create_client
from datetime import datetime, timezone

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']
BRIDGE_DB = '/Users/mariuszkrawczyk/codermariusz/kira/data/bridge.db'
PROJECT_ID = 'kira-dashboard'

def sync_stories(supabase, conn):
    """Sync stories from Bridge SQLite to Supabase."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id, epic_id, title, status, difficulty, recommended_model,
               assigned_model, domain, priority, estimated_effort,
               depends_on, blocks
        FROM stories
        WHERE project_id = ?
    """, (PROJECT_ID,))
    rows = cur.fetchall()

    if not rows:
        print(f"[sync_stories] No stories for {PROJECT_ID}")
        return 0

    now = datetime.now(timezone.utc).isoformat()
    records = []
    for row in rows:
        (id_, epic_id, title, status, difficulty, rec_model,
         asgn_model, domain, priority, effort, depends_on, blocks) = row
        records.append({
            'id': id_,
            'project_id': PROJECT_ID,
            'epic_id': epic_id,
            'title': title,
            'status': status or 'BACKLOG',
            'difficulty': difficulty,
            'recommended_model': rec_model,
            'assigned_model': asgn_model,
            'domain': domain,
            'priority': priority,
            'estimated_effort': effort,
            'depends_on': depends_on.split(',') if depends_on else [],
            'blocks': blocks.split(',') if blocks else [],
            'synced_at': now,
            'updated_at': now,
        })

    # Batch upsert (max 500 per request)
    for i in range(0, len(records), 500):
        batch = records[i:i+500]
        supabase.table('bridge_stories').upsert(
            batch,
            on_conflict='id,project_id'
        ).execute()

    print(f"[sync_stories] Synced {len(records)} stories")
    return len(records)


def sync_epics(supabase, conn):
    """Sync epics with computed story counts."""
    cur = conn.cursor()
    cur.execute("""
        SELECT e.id, e.title, e.status,
               COUNT(s.id) as total,
               SUM(CASE WHEN s.status = 'DONE' THEN 1 ELSE 0 END) as done
        FROM epics e
        LEFT JOIN stories s ON s.epic_id = e.id AND s.project_id = e.project_id
        WHERE e.project_id = ?
        GROUP BY e.id, e.title, e.status
    """, (PROJECT_ID,))
    rows = cur.fetchall()

    now = datetime.now(timezone.utc).isoformat()
    records = [
        {
            'id': row[0],
            'project_id': PROJECT_ID,
            'title': row[1],
            'status': row[2] or 'DRAFT',
            'total_stories': row[3] or 0,
            'done_stories': row[4] or 0,
            'synced_at': now,
            'updated_at': now,
        }
        for row in rows
    ]

    if records:
        supabase.table('bridge_epics').upsert(
            records, on_conflict='id,project_id'
        ).execute()

    print(f"[sync_epics] Synced {len(records)} epics")
    return len(records)


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    conn = sqlite3.connect(BRIDGE_DB)
    try:
        sync_stories(supabase, conn)
        sync_epics(supabase, conn)
        # Istniejące: sync_runs(supabase, conn)
    except Exception as e:
        print(f"[sync] ERROR: {e}")
        raise
    finally:
        conn.close()
```

### Sprawdź schemat SQLite przed implementacją

```bash
cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate
python -c "
import sqlite3
conn = sqlite3.connect('data/bridge.db')
cur = conn.cursor()
cur.execute('PRAGMA table_info(stories)')
print([r[1] for r in cur.fetchall()])
cur.execute('PRAGMA table_info(epics)')
print([r[1] for r in cur.fetchall()])
conn.close()
"
```

### Uruchomienie (env vars z .env.local kira-dashboard)

```bash
cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL ../kira-dashboard/.env.local | cut -d= -f2) \
SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_KEY ../kira-dashboard/.env.local | cut -d= -f2) \
python scripts/sync_bridge_to_supabase.py
```

---

## ⚠️ Edge Cases

### EC-1: Kolumna `depends_on` w SQLite jest NULL lub string
Scenariusz: Bridge przechowuje jako `"STORY-1.1,STORY-1.2"` lub NULL
Oczekiwane zachowanie: `depends_on.split(',') if depends_on else []` — bezpieczne

### EC-2: `project_id` kolumna nie istnieje w stories tabeli Bridge
Scenariusz: SQLite schema różni się od oczekiwanego
Oczekiwane zachowanie: sprawdź przez `PRAGMA table_info(stories)` przed implementacją i dostosuj query

### EC-3: Supabase rate limit (100 req/s na free tier)
Scenariusz: batch 500 stories — jeden request, ale przy >500 kilka requestów
Oczekiwane zachowanie: `time.sleep(0.1)` między batchami — spokojne 10 req/s

### EC-4: Bridge SQLite locked przez inny proces
Scenariusz: Bridge aktywnie pisze gdy sync czyta
Oczekiwane zachowanie: `connect(BRIDGE_DB, timeout=10, check_same_thread=False)` + try/except `OperationalError`

---

## 🚫 Out of Scope tej Story
- Sync NightClaw data (STORY-12.5)
- Sync patterns/lessons (STORY-12.6)
- API endpoints czytające z Supabase (STORY-12.7, 12.8)

---

## ✔️ Definition of Done
- [ ] `sync_bridge_to_supabase.py` rozszerzony o `sync_stories()` i `sync_epics()`
- [ ] Skrypt uruchomiony ręcznie — stories i epics w Supabase
- [ ] Upsert działa — wielokrotne uruchomienie nie duplikuje
- [ ] Błąd Supabase obsłużony gracefully (loguje + exit 1)
- [ ] Czas sync <10s dla aktualnego stanu DB
- [ ] Cron `sync-bridge-to-supabase` uruchomiony po zmianie — dane aktualne
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
