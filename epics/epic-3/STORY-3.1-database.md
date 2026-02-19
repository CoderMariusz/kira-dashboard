---
story_id: STORY-3.1
title: "Admin tworzy tabelę user_roles z RLS policies i triggerem updated_at w Supabase"
epic: EPIC-3
module: auth
domain: database
status: ready
difficulty: moderate
recommended_model: codex-5.3
ux_reference: none
api_reference: none
priority: must
estimated_effort: 5h
depends_on: none
blocks: STORY-3.2, STORY-3.3, STORY-3.4, STORY-3.5
tags: [migration, rls, user-roles, supabase, seed, trigger]
---

## 🎯 User Story

**Jako** system (backend/middleware)
**Chcę** mieć tabelę `user_roles` w Supabase z odpowiednimi politykami RLS, triggerem `updated_at` i seedem roli ADMIN dla Mariusza
**Żeby** middleware RBAC i wszystkie inne stories z EPIC-3 mogły weryfikować role użytkowników bezpośrednio z bazy danych

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik migracji: `supabase/migrations/20260219000001_user_roles.sql`
- Tabela docelowa: `public.user_roles` w Supabase Postgres
- RLS na poziomie Supabase — nie w aplikacji
- Brak pliku TypeScript do napisania w tej story — czysta migracja SQL

### Powiązane pliki
- `supabase/migrations/` — katalog na plik migracji (utwórz jeśli nie istnieje)
- `archive/src/lib/types/database.ts` — typy TypeScript dla Supabase (reuse, NIE modyfikuj w tej story)
- `archive/src/lib/supabase/server.ts` — client server-side (reuse w kolejnych stories)

### Stan systemu przed tą story
- Supabase projekt istnieje i jest podłączony (env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` są w `.env.local`)
- Supabase CLI jest zainstalowane (`npx supabase` lub `supabase` globalnie)
- `auth.users` tabela istnieje (wbudowana w Supabase — NIE tworzymy jej)
- NIE istnieje tabela `public.user_roles` — tworzymy ją w tej story
- Mariusz ma konto w Supabase Auth (email: dostępny przez `auth.users` — seed używa subquery po email)

---

## ✅ Acceptance Criteria

### AC-1: Tabela user_roles istnieje ze wszystkimi kolumnami i ograniczeniami
GIVEN: Supabase projekt jest uruchomiony, migracja nie była jeszcze zastosowana
WHEN: Wykonam komendę `npx supabase db push` lub `npx supabase migration up`
THEN: Tabela `public.user_roles` istnieje z dokładnie tymi kolumnami:
- `id` — typ `uuid`, NOT NULL, PRIMARY KEY, domyślna wartość `gen_random_uuid()`
- `user_id` — typ `uuid`, NOT NULL, FOREIGN KEY do `auth.users(id)` z `ON DELETE CASCADE`
- `role` — typ `TEXT`, NOT NULL, CHECK constraint: wartość musi być jedną z `('ADMIN', 'HELPER_PLUS', 'HELPER')`
- `created_at` — typ `TIMESTAMPTZ`, NOT NULL, domyślna wartość `now()`
- `updated_at` — typ `TIMESTAMPTZ`, NOT NULL, domyślna wartość `now()`
AND: Na parze (`user_id`) istnieje constraint UNIQUE (jeden user = jedna rola)

### AC-2: RLS jest włączone i polityka SELECT pozwala zalogowanemu użytkownikowi widzieć tylko swoją rolę
GIVEN: Tabela `user_roles` istnieje z włączonym RLS
WHEN: Zalogowany użytkownik (np. Angelika, `auth.uid() = UUID_ANGELIKI`) wykonuje `SELECT * FROM user_roles`
THEN: Zapytanie zwraca wyłącznie wiersze gdzie `user_id = auth.uid()` (czyli własny rekord)
AND: Nie zwraca wierszy innych użytkowników, nawet jeśli istnieją w tabeli

### AC-3: RLS blokuje INSERT/UPDATE/DELETE dla nie-ADMINów
GIVEN: Zalogowany użytkownik z rolą HELPER_PLUS (np. Angelika) próbuje wykonać `INSERT INTO user_roles (user_id, role) VALUES ('uuid-zuzy', 'HELPER')`
WHEN: Zapytanie trafia do Supabase przez anon key (nie service role key)
THEN: Supabase zwraca błąd `42501 insufficient_privilege` lub `new row violates row-level security policy`
AND: Rekord NIE jest dodany do tabeli

### AC-4: RLS pozwala ADMINowi na INSERT/UPDATE/DELETE
GIVEN: Zalogowany użytkownik (Mariusz) ma rekord w `user_roles` z rolą `ADMIN`
WHEN: Wykonuje `INSERT INTO user_roles (user_id, role) VALUES ('uuid-zuzy', 'HELPER')` przez anon key
THEN: Rekord zostaje wstawiony do tabeli bez błędu
AND: Wykonuje `UPDATE user_roles SET role = 'HELPER_PLUS' WHERE user_id = 'uuid-zuzy'` — rekord zostaje zaktualizowany
AND: Wykonuje `DELETE FROM user_roles WHERE user_id = 'uuid-zuzy'` — rekord zostaje usunięty

### AC-5: Trigger automatycznie aktualizuje updated_at przy każdym UPDATE
GIVEN: Rekord Angeliki istnieje w `user_roles` z `updated_at = '2026-01-01 10:00:00+00'`
WHEN: Mariusz (ADMIN) wykonuje `UPDATE user_roles SET role = 'HELPER_PLUS' WHERE user_id = 'uuid-angeliki'`
THEN: Kolumna `updated_at` rekordu Angeliki zostaje automatycznie ustawiona na `now()` (timestamp bieżącego momentu)
AND: Kolumna `created_at` pozostaje bez zmian (`'2026-01-01 10:00:00+00'`)

### AC-6: Seed — rekord ADMIN dla Mariusza istnieje po migracji
GIVEN: Migracja została zastosowana, Mariusz ma konto w `auth.users` z emailem `m.krawczyk@example.com` (lub emailem z env)
WHEN: Wykonuję `SELECT * FROM user_roles` jako service role
THEN: Istnieje dokładnie jeden rekord z `user_id = (SELECT id FROM auth.users WHERE email = 'EMAIL_MARIUSZA')` i `role = 'ADMIN'`
AND: Jeśli konto Mariusza nie istnieje w `auth.users`, seed pomija INSERT (używa `ON CONFLICT DO NOTHING` + subquery z WHERE EXISTS lub `INSERT ... SELECT`)

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `supabase/migrations/20260219000001_user_roles.sql`

**UWAGA DLA IMPLEMENTUJĄCEGO:** Poniższy SQL to kompletna zawartość pliku migracji. Skopiuj go w całości.

```sql
-- ============================================================
-- Migration: 20260219000001_user_roles.sql
-- Description: Create user_roles table with RLS, trigger, seed
-- ============================================================

-- 1. TABELA user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('ADMIN', 'HELPER_PLUS', 'HELPER')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. INDEKS na user_id (FK + uniq lookup w middleware)
-- ============================================================
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);

-- 3. TRIGGER FUNCTION — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT — każdy zalogowany użytkownik widzi TYLKO swój wiersz
CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Helper function: sprawdza czy bieżący caller jest ADMIN
-- Używamy SECURITY DEFINER żeby ominąć RLS podczas sprawdzania roli callera
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

-- Policy: INSERT — tylko ADMIN może dodawać role
CREATE POLICY "user_roles_insert_admin_only"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy: UPDATE — tylko ADMIN może zmieniać role
CREATE POLICY "user_roles_update_admin_only"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy: DELETE — tylko ADMIN może usuwać role
CREATE POLICY "user_roles_delete_admin_only"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. SEED — rola ADMIN dla Mariusza
-- ============================================================
-- Używamy INSERT ... SELECT żeby bezpiecznie obsłużyć przypadek
-- gdy konto Mariusza nie istnieje jeszcze w auth.users
-- ON CONFLICT DO NOTHING: idempotentne przy ponownym wywołaniu
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'ADMIN'
FROM auth.users
WHERE email = 'mariusz@krawczyk.family'
ON CONFLICT (user_id) DO NOTHING;

-- ALTERNATYWNIE: jeśli email jest w env, użyj:
-- WHERE email = current_setting('app.admin_email', true)
-- i ustaw: ALTER DATABASE postgres SET "app.admin_email" = 'mariusz@krawczyk.family';
```

**WAŻNE — email Mariusza:** Wpisz właściwy email Mariusza w miejsce `mariusz@krawczyk.family`.
Możesz go sprawdzić przez Supabase Dashboard → Authentication → Users.
Jeśli preferujesz env var: użyj `current_setting('app.admin_email', true)` i dodaj SET w migracji.

### Indeksy

```sql
-- user_roles_user_id_idx na public.user_roles(user_id)
-- Powód: middleware RBAC odpytuje tabelę WHERE user_id = auth.uid() przy każdym request
-- Bez indeksu: seq scan przy każdym żądaniu HTTP (krytyczna ścieżka)
```

### Dane seedowe
- **Seed:** 1 rekord — rola ADMIN dla Mariusza
- **Idempotentny:** `ON CONFLICT (user_id) DO NOTHING` — bezpieczne wielokrotne wywołanie
- **Fallback:** jeśli konto nie istnieje w auth.users, INSERT jest pomijany (subquery SELECT zwraca 0 wierszy)
- Pozostali użytkownicy (Angelika, Zuza, Iza) — dodawani przez STORY-3.4 (User management API)

### Row Level Security (RLS)

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| user_roles_select_own | SELECT | authenticated | `auth.uid() = user_id` |
| user_roles_insert_admin_only | INSERT | authenticated | `public.is_admin()` = true |
| user_roles_update_admin_only | UPDATE | authenticated | `public.is_admin()` = true |
| user_roles_delete_admin_only | DELETE | authenticated | `public.is_admin()` = true |

#### Szczegół — funkcja is_admin() z SECURITY DEFINER

```sql
-- DLACZEGO SECURITY DEFINER?
-- Bez SECURITY DEFINER: sprawdzenie roli callera odczytuje z user_roles z zastosowaniem RLS
-- Problem: polityka INSERT używa is_admin() → is_admin() próbuje SELECT z user_roles →
--          RLS SELECT policy mówi "tylko własny rekord" → OK, ale tylko jeśli rekord istnieje
-- SECURITY DEFINER: funkcja wykonuje się z uprawnieniami właściciela (postgres), omijając RLS
-- Dzięki temu is_admin() zawsze widzi dane w tabeli, nawet przy INSERT nowego wiersza

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'
  );
$$;
```

### Rollback Plan

```sql
-- Plik: supabase/migrations/20260219000001_user_roles_rollback.sql
-- LUB dodaj sekcję rollback jeśli używasz Supabase CLI z down migrations

DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.is_admin();
DROP TABLE IF EXISTS public.user_roles;
```

---

## ⚠️ Edge Cases

### EC-1: Konto Mariusza nie istnieje jeszcze w auth.users podczas migracji
Scenariusz: Migracja jest uruchamiana na świeżym projekcie Supabase zanim Mariusz zarejestruje konto
Oczekiwane zachowanie: `INSERT ... SELECT` zwraca 0 wierszy → INSERT jest pomijany → migracja kończy się sukcesem bez błędu
Konsekwencja: Mariusz musi być dodany do user_roles ręcznie przez Dashboard lub kolejną migrację seed po założeniu konta

### EC-2: Migracja uruchamiana wielokrotnie (idempotentność)
Scenariusz: Developer uruchamia `npx supabase db push` drugi raz (np. po resecie local dev)
Oczekiwane zachowanie:
- `CREATE TABLE IF NOT EXISTS` — bez błędu
- `CREATE OR REPLACE FUNCTION` — bez błędu
- `CREATE OR REPLACE TRIGGER` — bez błędu
- `INSERT ... ON CONFLICT DO NOTHING` — bez błędu, istniejący rekord Mariusza nie jest duplikowany
- `CREATE POLICY` — **UWAGA:** `CREATE POLICY` NIE ma `IF NOT EXISTS` w starszych Postgres. Rozwiązanie: poprzedź każdą politykę `DROP POLICY IF EXISTS "nazwa" ON public.user_roles;` przed `CREATE POLICY`

### EC-3: Użytkownik próbuje wstawić rolę spoza dozwolonej listy
Scenariusz: ADMIN wykonuje `INSERT INTO user_roles (user_id, role) VALUES ('uuid', 'SUPERUSER')`
Oczekiwane zachowanie: Supabase zwraca błąd CHECK constraint violation: `new row for relation "user_roles" violates check constraint "user_roles_role_check"`
Rekord NIE jest wstawiony

### EC-4: CASCADE DELETE — usunięcie użytkownika z auth.users
Scenariusz: Mariusz usuwa konto Zuzy z Supabase Auth Dashboard
Oczekiwane zachowanie: Rekord w `user_roles` dla Zuzy jest automatycznie usuwany (ON DELETE CASCADE)
Weryfikacja: `SELECT * FROM user_roles WHERE user_id = 'uuid-zuzy'` zwraca 0 wierszy

---

## 🚫 Out of Scope tej Story
- Tworzenie kont użytkowników (Angelika, Zuza, Iza) — STORY-3.4
- Invite flow (email zaproszenia) — STORY-3.4
- Typy TypeScript dla tabeli user_roles — STORY-3.5
- Odczyt roli w middleware Next.js — STORY-3.3
- Conditional sidebar per rola — STORY-3.7
- Strona zarządzania użytkownikami `/settings/users` — STORY-3.8

---

## ✔️ Definition of Done
- [ ] Plik `supabase/migrations/20260219000001_user_roles.sql` istnieje w repozytorium
- [ ] Migracja przechodzi na czystej bazie: `npx supabase db reset && npx supabase db push` kończy się sukcesem
- [ ] Tabela `public.user_roles` istnieje z wymaganymi kolumnami i constraints (weryfikacja: `\d public.user_roles` w psql)
- [ ] RLS jest włączone na tabeli (`SELECT relrowsecurity FROM pg_class WHERE relname = 'user_roles'` = true)
- [ ] Test: SELECT jako Angelika zwraca tylko jej wiersz — nie zwraca wiersza Mariusza
- [ ] Test: INSERT jako Angelika zwraca błąd RLS
- [ ] Test: INSERT jako Mariusz (ADMIN) kończy się sukcesem
- [ ] Trigger `user_roles_updated_at` istnieje i aktualizuje `updated_at` przy UPDATE
- [ ] Seed: rekord ADMIN dla Mariusza istnieje po migracji (jeśli konto istnieje w auth.users)
- [ ] Rollback: `DROP TABLE IF EXISTS public.user_roles` nie zostawia artefaktów (funkcje, triggery)
- [ ] Migracja przechodzi na czystej bazie (up)
- [ ] RLS blokuje dostęp dla ról które nie powinny mieć dostępu
- [ ] RLS pozwala na dostęp dla ról które powinny mieć
- [ ] Indeksy dodane dla kolumn używanych w WHERE/JOIN
- [ ] Rollback przetestowany
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
