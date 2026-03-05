---
story_id: STORY-10.4
title: "Dashboard presets schema — kb_dashboard_presets per rola"
epic: EPIC-10
module: settings
domain: database
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.3]
blocks: [STORY-10.5]
tags: [migration, schema, dashboard, presets, roles, sqlite]
---

## 🎯 User Story

**Jako** system KiraBoard
**Chcę** mieć tabelę `kb_dashboard_presets` przechowującą konfigurację widgetów per rola
**Żeby** po zalogowaniu każda rola (admin/family/guest) automatycznie ładowała odpowiedni układ dashboardu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Baza danych SQLite — plik `kiraboard.db`.
Tabela `kb_dashboard_presets` przechowuje JSON z listą widgetów (kolejność + widoczność) per rola.

### Powiązane pliki
- `db/migrations/011_kb_dashboard_presets.sql` — plik migracji
- `db/seed.sql` — domyślne presety per rola (admin/family/guest)
- `lib/db.ts` — instancja better-sqlite3

### Stan systemu przed tą story
- STORY-0.3 ukończona: baza SQLite istnieje, runner migracji działa
- Role w systemie: `admin`, `family`, `guest` (zdefiniowane w `kb_users.role` lub `users.json`)

---

## ✅ Acceptance Criteria

### AC-1: Tabela kb_dashboard_presets zostaje utworzona przez migrację
GIVEN: czysta baza SQLite bez tabeli `kb_dashboard_presets`
WHEN: runner migracji wykona plik `011_kb_dashboard_presets.sql`
THEN: tabela istnieje z kolumnami: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `role TEXT NOT NULL UNIQUE`, `widgets_json TEXT NOT NULL`, `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
AND: unikalny indeks na `role` istnieje (jedna konfiguracja per rola)

### AC-2: Seed tworzy domyślne presety dla 3 ról
GIVEN: tabela `kb_dashboard_presets` jest pusta
WHEN: `db/seed.sql` zostanie wykonany
THEN: istnieją 3 rekordy: `role='admin'`, `role='family'`, `role='guest'` — każdy z poprawnym `widgets_json`

### AC-3: widgets_json ma poprawną strukturę
GIVEN: rekord presetów dla roli `admin` istnieje w bazie
WHEN: odczytany i zparsowany `widgets_json`
THEN: jest poprawnym JSON array zawierającym obiekty z polami: `widget_id: string`, `visible: boolean`, `order: number`
AND: array jest posortowany rosnąco po `order`

### AC-4: Migracja jest idempotentna
GIVEN: migracja już była wykonana
WHEN: runner wykona ją ponownie
THEN: brak błędu — tabela i dane pozostają niezmienione

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `db/migrations/011_kb_dashboard_presets.sql`

```sql
CREATE TABLE IF NOT EXISTS kb_dashboard_presets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  role         TEXT    NOT NULL UNIQUE,    -- 'admin' | 'family' | 'guest'
  widgets_json TEXT    NOT NULL,           -- JSON array widgetów
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

#### Indeksy

```sql
-- Indeks unikalny na role — jedna konfiguracja per rola
-- (UNIQUE constraint w CREATE TABLE wystarcza, ale jawny indeks dla czytelności)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_dashboard_presets_role
  ON kb_dashboard_presets (role);
```

#### Struktura widgets_json

```json
[
  { "widget_id": "pipeline_status",  "visible": true,  "order": 1 },
  { "widget_id": "ai_usage",         "visible": true,  "order": 2 },
  { "widget_id": "system_health",    "visible": true,  "order": 3 },
  { "widget_id": "shopping_list",    "visible": false, "order": 4 },
  { "widget_id": "calendar",         "visible": false, "order": 5 },
  { "widget_id": "weather",          "visible": false, "order": 6 }
]
```

#### Dane seedowe (domyślne presety per rola)

```sql
-- Admin: Pipeline + AI Usage + System Health widoczne
INSERT OR IGNORE INTO kb_dashboard_presets (role, widgets_json) VALUES (
  'admin',
  '[
    {"widget_id":"pipeline_status","visible":true,"order":1},
    {"widget_id":"ai_usage","visible":true,"order":2},
    {"widget_id":"system_health","visible":true,"order":3},
    {"widget_id":"shopping_list","visible":false,"order":4},
    {"widget_id":"calendar","visible":false,"order":5},
    {"widget_id":"weather","visible":false,"order":6}
  ]'
);

-- Family (Angelika): Shopping + Calendar + Weather widoczne
INSERT OR IGNORE INTO kb_dashboard_presets (role, widgets_json) VALUES (
  'family',
  '[
    {"widget_id":"shopping_list","visible":true,"order":1},
    {"widget_id":"calendar","visible":true,"order":2},
    {"widget_id":"weather","visible":true,"order":3},
    {"widget_id":"pipeline_status","visible":false,"order":4},
    {"widget_id":"ai_usage","visible":false,"order":5},
    {"widget_id":"system_health","visible":false,"order":6}
  ]'
);

-- Guest: tylko Weather widoczny, wszystko inne ukryte
INSERT OR IGNORE INTO kb_dashboard_presets (role, widgets_json) VALUES (
  'guest',
  '[
    {"widget_id":"weather","visible":true,"order":1},
    {"widget_id":"shopping_list","visible":false,"order":2},
    {"widget_id":"calendar","visible":false,"order":3},
    {"widget_id":"pipeline_status","visible":false,"order":4},
    {"widget_id":"ai_usage","visible":false,"order":5},
    {"widget_id":"system_health","visible":false,"order":6}
  ]'
);
```

#### Znane widget_id (dokumentacja, nie constraint DB)
| widget_id | Opis |
|-----------|------|
| `pipeline_status` | Status pipeline Kira (EPIC-1) |
| `ai_usage` | Zużycie tokenów AI (EPIC-1) |
| `system_health` | Health check Bridge/OpenClaw (EPIC-1) |
| `shopping_list` | Lista zakupów (EPIC-4) |
| `calendar` | Kalendarz rodzinny (EPIC-4) |
| `weather` | Pogoda (EPIC-4) |

### Row Level Security (RLS)
Nie dotyczy — SQLite. Dostęp kontrolowany przez API middleware.

### Rollback Plan
```sql
-- Down migration
DROP INDEX IF EXISTS idx_kb_dashboard_presets_role;
DROP TABLE IF EXISTS kb_dashboard_presets;
```

---

## ⚠️ Edge Cases

### EC-1: Nowa rola dodana do systemu bez presetów
Scenariusz: ktoś doda rolę `moderator` do `kb_users` ale brak rekordu w `kb_dashboard_presets`
Oczekiwane zachowanie: API (STORY-10.5) powinno fallback na preset `guest` gdy rola nieznana — baza nie crasha, zwraca NULL; obsługa w API

### EC-2: Zepsuty JSON w widgets_json
Scenariusz: bezpośrednia edycja bazy (np. przez admin SQLite) wstawia niepoprawny JSON
Oczekiwane zachowanie: API przy SELECT i JSON.parse() złapie błąd → zwróci fallback preset z seed data (nie crash serwera)

### EC-3: Próba wstawienia duplikatu roli
Scenariusz: INSERT bez OR IGNORE dla roli `admin` która już istnieje
Oczekiwane zachowanie: SQLite zwraca UNIQUE constraint error — seed używa `INSERT OR IGNORE` więc seed jest bezpieczny

---

## 🚫 Out of Scope tej Story
- API do odczytu/zapisu presetów — to STORY-10.5
- Preset editor UI — to STORY-10.6
- Ładowanie presetu po logowaniu — to STORY-10.7
- Presety per użytkownik (nie per rola) — to future feature

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Migracja przechodzi na czystej bazie (up i down)
- [ ] Unikalny indeks na `role` blokuje duplikaty
- [ ] Seed tworzy 3 presety (admin/family/guest) z poprawnymi JSON
- [ ] widgets_json ma poprawną strukturę (widget_id, visible, order)
- [ ] Rollback usuwa tabelę bez błędów
- [ ] Story review przez PO
