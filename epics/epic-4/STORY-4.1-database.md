---
story_id: STORY-4.1
title: "Supabase tables migration — shopping, tasks, activity, households"
epic: EPIC-4
module: home
domain: database
status: ready
difficulty: complex
recommended_model: codex-5.3
ux_reference: none
api_reference: none
priority: must
estimated_effort: 8 h
depends_on: EPIC-1, EPIC-3
blocks: STORY-4.2, STORY-4.3, STORY-4.4, STORY-4.5, STORY-4.6, STORY-4.7, STORY-4.8, STORY-4.9
tags: [migration, rls, supabase, households, shopping, tasks, activity, kanban]
---

## 🎯 User Story

**Jako** administrator systemu Kira Dashboard (Mariusz, rola ADMIN)
**Chcę** mieć w Supabase gotowy zestaw tabel z włączonym RLS dla modułu Home
**Żeby** komponent Shopping List, Kanban Board, Activity Feed i Household Management mogły zapisywać i odczytywać dane w sposób bezpieczny — każda rodzina widzi wyłącznie swoje dane

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Plik migracji: `supabase/migrations/20260219120000_home_module_schema.sql`
Wykonywany przez: `supabase db push` lub bezpośrednio przez Supabase SQL Editor.
Projekt Supabase: kira-dashboard (nowy projekt, NIE archive/).

### Powiązane pliki
- Istniejąca migracja archiwalna: `archive/supabase/migrations/20260203205700_initial_schema.sql` — przejrzyj jako wzór; NIE kopiuj bezpośrednio, schema się różni
- Po ukończeniu tej story: `STORY-4.2` używa tych tabel przez Next.js API routes
- Po ukończeniu tej story: `STORY-4.3` używa tych tabel przez Supabase client (real-time)

### Stan systemu przed tą story
- Supabase projekt jest już założony i połączony z repozytorium (`supabase link` wykonany)
- Tabela `auth.users` istnieje (zarządzana przez Supabase Auth) — można się do niej odwoływać przez FK
- EPIC-3 ukończony — użytkownicy mogą się logować przez Supabase Auth
- **Żadna z 6 tabel opisanych poniżej jeszcze nie istnieje** w nowym projekcie

---

## ✅ Acceptance Criteria

### AC-1: Wszystkie 6 tabel istnieje po uruchomieniu migracji
GIVEN: Supabase projekt jest pusty (brak tabel z modułu home)
WHEN: Uruchomiono `supabase db push` lub wklejono SQL do Supabase SQL Editor i wykonano
THEN: Tabele `households`, `household_members`, `shopping_items`, `columns`, `tasks`, `activity_log` istnieją z poprawnymi kolumnami, typami i constraintami
AND: `\dt` (lub Supabase Table Editor) pokazuje wszystkie 6 tabel

### AC-2: RLS jest włączone i zalogowany user widzi tylko dane swojego household
GIVEN: Istnieją 2 różne households: household_A (user_A jako ADMIN) i household_B (user_B jako ADMIN)
AND: household_A ma 2 shopping_items, household_B ma 3 shopping_items
WHEN: user_A wykonuje zapytanie `SELECT * FROM shopping_items` przez Supabase client (z JWT user_A)
THEN: Zwracane są dokładnie 2 rekordy należące do household_A
AND: 3 rekordy household_B nie są widoczne

### AC-3: Niezalogowany user (anon) nie może odczytać żadnych danych
GIVEN: Tabela shopping_items zawiera rekordy
WHEN: Wykonano `SELECT * FROM shopping_items` bez tokenu JWT (rola anon)
THEN: Zwrócony wynik to pusty zestaw (0 rekordów) lub błąd RLS
AND: Żaden rekord nie jest ujawniany

### AC-4: Tworzenie household przez zalogowanego użytkownika
GIVEN: Zalogowany user (auth.uid() = 'user-uuid-xxx') nie należy jeszcze do żadnego household
WHEN: Wykonano `INSERT INTO households (name) VALUES ('Rodzina Kowalskich')`
THEN: Rekord pojawia się w tabeli `households`
AND: RLS policy "INSERT dla zalogowanych" przepuszcza tę operację

### AC-5: Tylko ADMIN może dodawać/usuwać członków household
GIVEN: user_B jest członkiem household_A z rolą 'HELPER'
WHEN: user_B próbuje wykonać `INSERT INTO household_members (household_id, user_id, role) VALUES (household_A_id, 'new-user-id', 'HELPER')`
THEN: Operacja jest odrzucona przez RLS (0 rows affected lub error)
AND: Tylko user z rolą 'ADMIN' w danym household może dodawać członków

### AC-6: activity_log INSERT działa dla zalogowanych członków household
GIVEN: user_A jest ADMIN household_A
WHEN: user_A wykonuje `INSERT INTO activity_log (household_id, actor_id, action, entity_type) VALUES (household_A_id, auth.uid(), 'shopping_added', 'shopping_item')`
THEN: Rekord pojawia się w activity_log
AND: user_B (inny household) nie widzi tego rekordu przez SELECT

### AC-7: Rollback SQL działa bez błędów
GIVEN: Migracja up została wykonana
WHEN: Wykonano sekcję `-- rollback` z pliku migracji (lub `supabase db reset`)
THEN: Wszystkie 6 tabel zostają usunięte bez błędów FK
AND: Baza wraca do stanu sprzed migracji

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `supabase/migrations/20260219120000_home_module_schema.sql`

Kolejność tworzenia tabel ma znaczenie ze względu na FK — zachowaj dokładnie tę kolejność:
1. `households` (bez FK do innych nowych tabel)
2. `household_members` (FK → households, FK → auth.users)
3. `columns` (FK → households)
4. `shopping_items` (FK → households, FK → auth.users)
5. `tasks` (FK → households, FK → columns, FK → auth.users)
6. `activity_log` (FK → households, FK → auth.users)

---

#### Tabela 1: `households`

```sql
CREATE TABLE households (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL DEFAULT 'Moja Rodzina',
  invite_code TEXT        UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Uwagi:
- `invite_code` musi być UNIQUE — użyty przy zapraszaniu przez link
- `gen_random_bytes(6)` wymaga rozszerzenia pgcrypto; jeśli nie jest dostępne, użyj `substring(md5(random()::text), 1, 12)`
- Trigger `update_updated_at` zostanie dodany poniżej (sekcja triggerów)

---

#### Tabela 2: `household_members`

```sql
CREATE TABLE household_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'HELPER'
                           CHECK (role IN ('ADMIN', 'HELPER+', 'HELPER')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
```

Uwagi:
- `role IN ('ADMIN', 'HELPER+', 'HELPER')` — trzy dozwolone wartości; ADMIN zarządza household, HELPER+ widzi analytics, HELPER to base member
- `UNIQUE(household_id, user_id)` — jeden user może być w danym household tylko raz
- `ON DELETE CASCADE` — jeśli household zostanie usunięty, wszyscy członkowie są usuwani

---

#### Tabela 3: `columns` (kanban columns)

```sql
CREATE TABLE columns (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  position     INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Uwagi:
- Każdy household ma własne kanban columns (nie globalnie współdzielone)
- `position` determinuje kolejność wyświetlania kolumn od lewej do prawej (0 = pierwsza)
- Domyślne kolumny dla nowego household są wstawiane przez SEED poniżej (po RLS)

---

#### Tabela 4: `shopping_items`

```sql
CREATE TABLE shopping_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'Inne',
  quantity     INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit         TEXT,
  is_bought    BOOLEAN     NOT NULL DEFAULT false,
  bought_at    TIMESTAMPTZ,
  added_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Uwagi:
- `category` to TEXT (nie FK do osobnej tabeli) — uproszczony model względem archive
- `unit` jest opcjonalny (np. 'kg', 'szt', 'l') — może być NULL
- `CHECK (quantity > 0)` — nie można dodać 0 lub ujemnej ilości
- `bought_at` jest ustawiany przez trigger gdy `is_bought` zmienia się na true

---

#### Tabela 5: `tasks`

```sql
CREATE TABLE tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  column_id    UUID        NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  priority     TEXT        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  position     INTEGER     NOT NULL DEFAULT 0,
  assigned_to  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date     DATE,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Uwagi:
- `column_id` FK → columns (nie enum jak w archive) — elastyczne kolumny per household
- `priority` CHECK constraint — tylko 4 dozwolone wartości
- `completed_at` ustawiany automatycznie gdy task trafia do ostatniej kolumny (trigger opcjonalny; można implementować w aplikacji)
- `position` to INTEGER — drag & drop ustawia nową wartość; zalecany krok 1000 (1000, 2000, 3000...) żeby móc wstawiać pomiędzy bez pełnego reindeksowania

---

#### Tabela 6: `activity_log`

```sql
CREATE TABLE activity_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   TEXT,
  action       TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    UUID,
  entity_name  TEXT,
  details      JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Uwagi:
- `actor_id` może być NULL (dla akcji systemowych/automatycznych)
- `actor_name` zapisujemy redundantnie — nawet jeśli user zostanie usunięty, historia pozostaje czytelna
- `action` — przykładowe wartości: `'shopping_added'`, `'shopping_bought'`, `'shopping_deleted'`, `'task_created'`, `'task_moved'`, `'task_completed'`, `'task_deleted'`, `'member_joined'`
- `entity_type` — przykładowe wartości: `'shopping_item'`, `'task'`, `'household'`, `'member'`
- `details` — JSONB dla elastycznych danych (np. `{"from_column": "Todo", "to_column": "Done"}` dla task_moved)
- Brak `updated_at` — logi są immutable, nigdy nie edytowane

---

#### Indeksy

```sql
-- Szybkie filtry w API (household_id WHERE)
CREATE INDEX idx_household_members_household ON household_members(household_id);
CREATE INDEX idx_household_members_user     ON household_members(user_id);
CREATE INDEX idx_shopping_items_household   ON shopping_items(household_id);
CREATE INDEX idx_shopping_items_is_bought   ON shopping_items(household_id, is_bought);
CREATE INDEX idx_columns_household          ON columns(household_id);
CREATE INDEX idx_tasks_household            ON tasks(household_id);
CREATE INDEX idx_tasks_column               ON tasks(column_id);
CREATE INDEX idx_tasks_position             ON tasks(column_id, position);
CREATE INDEX idx_activity_log_household     ON activity_log(household_id);
CREATE INDEX idx_activity_log_created       ON activity_log(created_at DESC);
```

Uzasadnienie indeksów:
- `idx_shopping_items_is_bought` — compound index bo API zawsze filtruje po `household_id` i często po `is_bought`
- `idx_tasks_position` — kluczowy dla drag & drop (ORDER BY position w ramach column_id)
- `idx_activity_log_created DESC` — feed zawsze pobiera N ostatnich rekordów sorted by created_at DESC

---

#### Triggery

```sql
-- Trigger: auto-update updated_at (dotyczy: households, shopping_items, tasks)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_shopping_items_updated_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: auto-set bought_at gdy is_bought zmienia się na true
CREATE OR REPLACE FUNCTION set_shopping_bought_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_bought = true AND OLD.is_bought = false THEN
    NEW.bought_at = now();
  ELSIF NEW.is_bought = false AND OLD.is_bought = true THEN
    NEW.bought_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_shopping_items_bought_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION set_shopping_bought_at();
```

---

#### Helper function (dla RLS)

```sql
-- Funkcja pomocnicza używana w RLS policies — bezpieczna, SECURITY DEFINER
-- Zwraca listę household_id do których należy aktualny user
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF UUID AS $$
  SELECT household_id
  FROM household_members
  WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

Dlaczego `SECURITY DEFINER`: policy RLS wywołująca subquery do `household_members` mogłaby wpaść w rekurencję (RLS na `household_members` sprawdza `household_members`). `SECURITY DEFINER` uruchamia funkcję z uprawnieniami właściciela (postgres), omijając RLS tabeli `household_members` tylko na potrzeby tej konkretnej weryfikacji.

---

### Row Level Security (RLS)

#### Włączenie RLS na wszystkich tabelach

```sql
ALTER TABLE households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log      ENABLE ROW LEVEL SECURITY;
```

---

#### Polityki — tabela: `households`

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| households_select_members | SELECT | authenticated | `id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())` |
| households_insert_authenticated | INSERT | authenticated | `true` (każdy zalogowany może tworzyć household) |
| households_update_admin | UPDATE | authenticated | `id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'ADMIN')` |
| households_delete_admin | DELETE | authenticated | `id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'ADMIN')` |

```sql
CREATE POLICY "households_select_members"
  ON households FOR SELECT TO authenticated
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "households_insert_authenticated"
  ON households FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "households_update_admin"
  ON households FOR UPDATE TO authenticated
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "households_delete_admin"
  ON households FOR DELETE TO authenticated
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'ADMIN'));
```

---

#### Polityki — tabela: `household_members`

Uwaga: ta tabela używa `get_my_household_ids()` (SECURITY DEFINER) zamiast subquery inline, aby uniknąć rekurencji RLS.

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| household_members_select | SELECT | authenticated | `household_id IN (SELECT get_my_household_ids())` |
| household_members_insert_admin | INSERT | authenticated | `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'ADMIN')` |
| household_members_delete_admin | DELETE | authenticated | `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'ADMIN')` |
| household_members_insert_self | INSERT | authenticated | Wyjątek: user może dodać samego siebie tylko jeśli zna invite_code — ta logika jest w aplikacji, nie RLS (RLS pozwala INSERT dla authenticated) |

```sql
-- SELECT: tylko członkowie widzą członków swojego household
CREATE POLICY "household_members_select"
  ON household_members FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_my_household_ids()));

-- INSERT: tylko ADMIN może dodawać nowych członków do swojego household
CREATE POLICY "household_members_insert_admin"
  ON household_members FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- DELETE: tylko ADMIN może usuwać członków ze swojego household
CREATE POLICY "household_members_delete_admin"
  ON household_members FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- UPDATE: ADMIN może zmieniać role innych; user może... (brak UPDATE policy = nikt nie może edytować bez service role)
-- Decyzja: zmiana roli wykonywana przez service role w API route, nie przez klienta
```

Ważna uwaga dla implementatora: polityka `household_members_insert_admin` blokuje PIERWSZĄ rejestrację (kiedy user tworzy nowy household i chce wpisać samego siebie jako ADMIN). Rozwiązanie: użyj **service role** w API route `/api/home/household` do INSERT pierwszego ADMIN — nie przez RLS, tylko przez `supabase-js` z `service_role` key po stronie serwera.

---

#### Polityki — tabela: `shopping_items`

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| shopping_select | SELECT | authenticated | `household_id IN (SELECT get_my_household_ids())` |
| shopping_insert | INSERT | authenticated | `household_id IN (SELECT get_my_household_ids())` |
| shopping_update | UPDATE | authenticated | `household_id IN (SELECT get_my_household_ids())` |
| shopping_delete | DELETE | authenticated | `household_id IN (SELECT get_my_household_ids())` |

```sql
CREATE POLICY "shopping_select"
  ON shopping_items FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "shopping_insert"
  ON shopping_items FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "shopping_update"
  ON shopping_items FOR UPDATE TO authenticated
  USING  (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "shopping_delete"
  ON shopping_items FOR DELETE TO authenticated
  USING (household_id IN (SELECT get_my_household_ids()));
```

---

#### Polityki — tabela: `columns`

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| columns_select | SELECT | authenticated | `household_id IN (SELECT get_my_household_ids())` |
| columns_insert_admin | INSERT | authenticated | `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'ADMIN')` |
| columns_update_admin | UPDATE | authenticated | analogicznie |
| columns_delete_admin | DELETE | authenticated | analogicznie |

```sql
CREATE POLICY "columns_select"
  ON columns FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "columns_insert_admin"
  ON columns FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "columns_update_admin"
  ON columns FOR UPDATE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "columns_delete_admin"
  ON columns FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );
```

---

#### Polityki — tabela: `tasks`

Zadania odczytują `household_id` bezpośrednio, więc RLS jest prosta:

```sql
CREATE POLICY "tasks_select"
  ON tasks FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE TO authenticated
  USING  (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "tasks_delete"
  ON tasks FOR DELETE TO authenticated
  USING (household_id IN (SELECT get_my_household_ids()));
```

---

#### Polityki — tabela: `activity_log`

```sql
-- SELECT: tylko członkowie household
CREATE POLICY "activity_select"
  ON activity_log FOR SELECT TO authenticated
  USING (household_id IN (SELECT get_my_household_ids()));

-- INSERT: każdy zalogowany członek household może wstawiać
-- (service role też może — omija RLS z definicji)
CREATE POLICY "activity_insert"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- UPDATE i DELETE: brak policy — activity_log jest immutable
-- Jedyna możliwość usunięcia: service role (np. cron archiwizacyjny)
```

---

#### Dane seedowe (kanban columns dla testów)

Seed NIE może być w migracji (bo nie zna household_id). Wstaw go przez aplikację lub Supabase SQL Editor manualnie po stworzeniu test household.

Przykładowy seed do testów:
```sql
-- UWAGA: wstaw dopiero po stworzeniu household i ustawieniu household_id
-- Zastąp 'YOUR-HOUSEHOLD-UUID' prawdziwym ID

INSERT INTO columns (household_id, name, position) VALUES
  ('YOUR-HOUSEHOLD-UUID', 'Do zrobienia', 0),
  ('YOUR-HOUSEHOLD-UUID', 'W trakcie',   1),
  ('YOUR-HOUSEHOLD-UUID', 'Zrobione',    2);
```

---

#### Włączenie Realtime

```sql
-- Realtime subscriptions dla STORY-4.3 (hooks)
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE columns;
```

---

### Rollback Plan

Sekcja do wykonania jeśli migracja musi być cofnięta. Kolejność odwrotna do tworzenia (ze względu na FK):

```sql
-- Rollback: usuń triggery
DROP TRIGGER IF EXISTS tr_tasks_updated_at        ON tasks;
DROP TRIGGER IF EXISTS tr_shopping_items_updated_at ON shopping_items;
DROP TRIGGER IF EXISTS tr_shopping_items_bought_at  ON shopping_items;
DROP TRIGGER IF EXISTS tr_households_updated_at    ON households;

-- Rollback: usuń funkcje
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS set_shopping_bought_at();
DROP FUNCTION IF EXISTS get_my_household_ids();

-- Rollback: usuń tabele (kolejność ważna — najpierw te z FK)
DROP TABLE IF EXISTS activity_log      CASCADE;
DROP TABLE IF EXISTS tasks             CASCADE;
DROP TABLE IF EXISTS shopping_items    CASCADE;
DROP TABLE IF EXISTS columns           CASCADE;
DROP TABLE IF EXISTS household_members CASCADE;
DROP TABLE IF EXISTS households        CASCADE;
```

---

## ⚠️ Edge Cases

### EC-1: Rekurencja RLS w `household_members`
Scenariusz: Policy SELECT na `household_members` używa subquery do `household_members` → nieskończona rekurencja → błąd "stack depth limit exceeded"
Oczekiwane zachowanie: Funkcja `get_my_household_ids()` z `SECURITY DEFINER` omija RLS tej tabeli, przerywając rekurencję
Komunikat dla użytkownika: n/d (błąd infrastrukturalny)
Implementacja: Pamiętaj aby policy SELECT na `household_members` używała `get_my_household_ids()` — **nie** inline subquery do `household_members`

### EC-2: Pierwszy ADMIN nie może się dodać sam przez RLS
Scenariusz: User tworzy nowy household. Chce się dodać jako ADMIN do `household_members`. Policy `household_members_insert_admin` wymaga istnienia rekordu w `household_members` — którego jeszcze nie ma.
Oczekiwane zachowanie: API route `/api/home/household` (POST) używa **Supabase service role** (server-side, nie klient) do INSERT pierwszego ADMIN rekordu po stworzeniu household. RLS nie dotyczy service role.
Komunikat dla użytkownika: n/d (transparentne dla usera)

### EC-3: Cascade delete usuwa dane gdy household jest usuwany
Scenariusz: ADMIN usuwa household — `ON DELETE CASCADE` na wszystkich tabelach usuwa wszystkie shopping_items, tasks, activity_log, household_members, columns tego household
Oczekiwane zachowanie: Dane są usuwane. To jest zamierzone zachowanie.
Komunikat dla użytkownika: API route powinien wyświetlić warning "Czy na pewno chcesz usunąć household? Wszystkie dane zostaną trwale usunięte." przed wykonaniem DELETE

### EC-4: pgcrypto niedostępne
Scenariusz: `gen_random_bytes(6)` używane w `invite_code` wymaga rozszerzenia pgcrypto. W niektórych konfiguracjach Supabase może być wyłączone.
Oczekiwane zachowanie: Jeśli `CREATE EXTENSION IF NOT EXISTS pgcrypto;` nie zadziała, użyj alternatywy: `substring(md5(random()::text || clock_timestamp()::text), 1, 12)` dla invite_code defaultu.
Test: Przed uruchomieniem migracji sprawdź `SELECT gen_random_bytes(6)` — jeśli error, użyj fallbacku.

---

## 🚫 Out of Scope tej Story
- Tabele dla modułu Pipeline (epics, stories, sprints) — to inne epic
- Tabela `profiles` — już zarządzana przez EPIC-3 (Supabase Auth + profile setup)
- Push notifications, calendar events — osobne epicy
- Partycjonowanie `activity_log` po dacie — na potrzeby v1 tabela płaska wystarczy
- Backup strategy — Supabase robi automatyczne backupy, nie wymagane tu

---

## ✔️ Definition of Done
- [ ] Migracja przechodzi na czystej bazie (`supabase db reset && supabase db push` bez błędów)
- [ ] Migracja rollback przechodzi bez błędów FK
- [ ] RLS blokuje SELECT z roli anon (zwraca 0 wierszy)
- [ ] RLS izoluje dane między 2 różnymi households (test manualny lub automated)
- [ ] `get_my_household_ids()` działa bez rekurencji (test: SELECT z zalogowanym userem)
- [ ] Trigger `bought_at` ustawia timestamp przy `UPDATE is_bought = true`
- [ ] Trigger `updated_at` ustawia aktualny czas przy UPDATE na shopping_items i tasks
- [ ] Indeksy założone dla kolumn używanych w WHERE/JOIN/ORDER BY
- [ ] Realtime włączony dla shopping_items, tasks, activity_log, columns
- [ ] Rollback przetestowany
- [ ] Kod przechodzi linter bez błędów (SQL linter jeśli dostępny)
- [ ] Story review przez PO
