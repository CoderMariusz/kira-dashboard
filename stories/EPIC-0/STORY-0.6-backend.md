---
story_id: STORY-0.6
title: "Sync script skeleton — node-cron + Supabase client"
epic: EPIC-0
module: infrastructure
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.3, STORY-0.5]
blocks: [STORY-0.14]
tags: [sync, supabase, cron, backend, infrastructure]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** mieć działający skrypt `sync_to_supabase.js` z node-cron co 60s i Supabase clientem
**Żeby** fundament pod pełną synchronizację (EPIC-12) był gotowy, a system logował aktywność sync

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Nowy plik: `sync_to_supabase.js` w root projektu
- Opcjonalna integracja: `server.cjs` — `require('./sync_to_supabase')` jeśli Supabase skonfigurowane
- Uruchamiany standalone: `node sync_to_supabase.js` lub jako moduł

### Stan systemu przed tą story
- STORY-0.3 ukończona — `kiraboard.db` z tabelami `kb_sync_log`, `kb_shopping_items`, `kb_tasks`, `kb_activity_log`
- STORY-0.5 ukończona — Supabase projekt z tabelami, `.env` skonfigurowany
- `better-sqlite3`, `@supabase/supabase-js`, `dotenv` zainstalowane

---

## ✅ Acceptance Criteria

### AC-1: Cron loguje aktywność co 60s
GIVEN: `sync_to_supabase.js` uruchomiony z `SUPABASE_URL` i `SUPABASE_SERVICE_KEY`
WHEN: Odczekasz 65 sekund
THEN: W konsoli pojawia się dwukrotnie `🔄 [ISO timestamp] Sync starting...` + `✅ Sync complete: N records`

### AC-2: Graceful degradation bez Supabase
GIVEN: Brak `SUPABASE_URL` lub `SUPABASE_SERVICE_KEY` w `.env`
WHEN: Uruchomisz `node sync_to_supabase.js`
THEN: Wyświetla `⚠️ Supabase not configured — sync disabled (set SUPABASE_URL + SUPABASE_SERVICE_KEY in .env)` i NIE rzuca błędu

### AC-3: Sync log zapisywany do SQLite
GIVEN: Cron uruchomiony
WHEN: Cron wykona jedną pętlę
THEN: `SELECT * FROM kb_sync_log ORDER BY id DESC LIMIT 3` zwraca rekordy z `status = 'skipped'` lub `'success'`

### AC-4: Sync table logic z timestampem
GIVEN: Tabela `kb_shopping_items` ma rekordy zmodyfikowane po ostatnim syncu
WHEN: Cron wykona pętlę
THEN: Rekordy są upsertowane do Supabase `shopping_items`, `kb_sync_log` ma wpis `status = 'success'`

---

## ⚙️ Szczegóły Backend

### Plik: `sync_to_supabase.js`

```javascript
require('dotenv').config();
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');

const SYNC_INTERVAL = process.env.SYNC_INTERVAL || '*/60 * * * * *'; // co 60s
const db = new Database(process.env.KB_DB_PATH || './kiraboard.db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncTable(tableName, localTable, remoteTable) {
  const lastSync = db.prepare(
    'SELECT synced_at FROM kb_sync_log WHERE table_name = ? ORDER BY synced_at DESC LIMIT 1'
  ).get(tableName);
  
  const since = lastSync?.synced_at || '1970-01-01T00:00:00Z';
  const rows = db.prepare(
    `SELECT * FROM ${localTable} WHERE updated_at > ? OR created_at > ?`
  ).all(since, since);
  
  if (rows.length === 0) {
    db.prepare(
      'INSERT INTO kb_sync_log (table_name, direction, records_synced, status) VALUES (?, ?, ?, ?)'
    ).run(tableName, 'up', 0, 'skipped');
    return { synced: 0, status: 'skipped' };
  }
  
  const { error } = await supabase.from(remoteTable).upsert(rows, { onConflict: 'id' });
  const status = error ? 'error' : 'success';
  db.prepare(
    'INSERT INTO kb_sync_log (table_name, direction, records_synced, status, error_message) VALUES (?, ?, ?, ?, ?)'
  ).run(tableName, 'up', rows.length, status, error?.message || null);
  
  return { synced: rows.length, status, error: error?.message };
}

async function runSync() {
  console.log(`🔄 [${new Date().toISOString()}] Sync starting...`);
  try {
    const results = {
      shopping: await syncTable('shopping', 'kb_shopping_items', 'shopping_items'),
      tasks: await syncTable('tasks', 'kb_tasks', 'tasks'),
      activity: await syncTable('activity', 'kb_activity_log', 'activity_log'),
    };
    const total = Object.values(results).reduce((s, r) => s + r.synced, 0);
    console.log(`✅ Sync complete: ${total} records`, results);
  } catch (err) {
    console.error('❌ Sync error:', err.message);
  }
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  cron.schedule(SYNC_INTERVAL, runSync);
  console.log(`📡 Supabase sync cron active (every 60s)`);
  runSync(); // initial sync on start
} else {
  console.log('⚠️ Supabase not configured — sync disabled (set SUPABASE_URL + SUPABASE_SERVICE_KEY in .env)');
}

module.exports = { runSync, syncTable };
```

**Integracja w server.cjs:**
```javascript
if (process.env.SUPABASE_URL) {
  require('./sync_to_supabase');
}
```

---

## ⚠️ Edge Cases

### EC-1: Supabase chwilowo niedostępny
Scenariusz: Network timeout podczas upsert
Oczekiwane zachowanie: Catch w `runSync` loguje `❌ Sync error: [message]`, wpis w `kb_sync_log` z `status = 'error'`, cron nie zatrzymuje się

### EC-2: Bardzo duże tabele (> 1000 rekordów w jednym sync)
Scenariusz: Pierwsza synchronizacja po długim braku dostępu Supabase
Oczekiwane zachowanie: Supabase ma limit 1000 rekordów na upsert — EPIC-12 doda batch logic; teraz jeden batch (może się nie udać dla bardzo dużych zestawów)

---

## 🚫 Out of Scope tej Story
- Sync w odwrotnym kierunku (Supabase → SQLite) — EPIC-12
- Bridge stories sync (bridge_stories, bridge_runs tabele) — EPIC-12
- Batch sync (paginacja) — EPIC-12
- Conflict resolution — EPIC-12

---

## ✔️ Definition of Done
- [ ] `npm install node-cron dotenv` dodane (lub już zainstalowane przez STORY-0.5)
- [ ] `sync_to_supabase.js` istnieje w root projektu
- [ ] `node sync_to_supabase.js` loguje aktywność co 60s gdy Supabase skonfigurowane
- [ ] Bez konfiguracji Supabase — loguje warning, nie crashuje
- [ ] `kb_sync_log` zapisywany po każdym cyklu
- [ ] Eksportuje `{ runSync, syncTable }` (dla STORY-0.14)
- [ ] `server.cjs` require'uje sync gdy `SUPABASE_URL` ustawiony
