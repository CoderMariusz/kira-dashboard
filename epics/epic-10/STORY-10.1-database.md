---
story_id: STORY-10.1
title: "Migracja user_roles — kolumny invited_by i invited_at"
epic: EPIC-10
domain: database
difficulty: simple
recommended_model: kimi-k2.5
depends_on: none
blocks: [STORY-10.3, STORY-10.5, STORY-10.7]
tags: [database, migration, supabase, user_roles]
---

## 🎯 User Story
Tabela user_roles przechowuje kto i kiedy zaprosił użytkownika.

## Spec pełna
`/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/EPIC-10-settings.md` → STORY-10.1

## Migracja
Plik: `supabase/migrations/YYYYMMDDHHMMSS_user_roles_invite_meta.sql`

```sql
-- UP
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_roles_invited_by ON user_roles(invited_by);

-- DOWN (w komentarzu lub osobnym pliku)
-- ALTER TABLE user_roles DROP COLUMN IF EXISTS invited_by, DROP COLUMN IF EXISTS invited_at;
```

## AC
- Migracja wykonuje się bez błędu: `supabase db push` lub `supabase migration up`
- Istniejące rekordy mają `invited_at = NOW()` (default), `invited_by = NULL`
- Nowe rekordy INSERT mogą podać `invited_by` i `invited_at`
- Indeks stworzony na `invited_by`

## DoD
- [ ] Plik migracji w `supabase/migrations/`
- [ ] `supabase db push` wykonuje się bez błędu
- [ ] TypeScript typ `UserRole` zaktualizowany o nowe pola (w `types/auth.types.ts` lub `types/settings.types.ts`)
- [ ] Testy: insert z nowymi polami, backfill istniejących
