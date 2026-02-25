---
story_id: STORY-7.6
title: "Golden Tasks Manager — tabela, CRUD drawer, filtr kategorii"
epic: EPIC-7
domain: frontend
difficulty: hard
recommended_model: sonnet
priority: must
depends_on: [STORY-7.5, STORY-7.2]
blocks: [STORY-7.8]
---

## 🎯 Cel
Zbudować sekcję "Golden Tasks" na stronie `/dashboard/eval`: tabela wszystkich zadań,
formularz add/edit w drawerze, filtr po kategorii, modal potwierdzenia usunięcia.
ADMIN widzi przyciski CRUD, pozostałe role — tryb read-only.

## Kontekst
**Projekt:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Sprawdź istniejące: `cat app/(dashboard)/eval/page.tsx` — obecna strona eval
Sprawdź komponenty: `ls components/pipeline/` — pattern drawerów z EPIC-6
Kolory: bg `#0d0c1a`, accent `#818cf8`, success `#34d399`, fail `#f87171`, border `#2a2540`
Stack: shadcn/ui, Tailwind, Zod, React Hook Form

## ✅ Acceptance Criteria

### AC-1: Filtr kategorii
Komponent: `components/eval/CategoryFilter.tsx`
- Przyciski: ALL | API | Auth | CRUD | Pipeline | Reasoning | Home
- Aktywny: `background: #818cf8`, `color: white`
- Nieaktywny: `border: 1px solid #2a2540`, `color: #a0a0b8`
- Filtruje lokalnie listę tasks (nie refetch)

### AC-2: Tabela golden tasks
Komponent: `components/eval/EvalTasksTable.tsx`
- Kolumny: Kategoria (badge kolorowy), Prompt (truncated 80 chars), Model, Aktywny (toggle ✓/✗), Ostatni wynik (PASS/FAIL badge), Akcje (edit/delete — tylko ADMIN)
- Pusta lista: `"Brak golden tasks. Dodaj pierwsze zadanie testowe."` z przyciskiem CTA (ADMIN only)
- Loading: skeleton rows (3 wiersze)
- Kolory badge kategorii: API=`#60a5fa`, Auth=`#f59e0b`, CRUD=`#34d399`, Pipeline=`#818cf8`, Reasoning=`#a78bfa`, Home=`#fb923c`

### AC-3: Drawer add/edit
Komponent: `components/eval/EvalTaskDrawer.tsx`
- Trigger: przycisk "Dodaj task" (ADMIN) lub ikona edit przy wierszu
- Formularz (Zod + React Hook Form):
  ```
  prompt: textarea, min 10 chars, max 2000, wymagane
  expected_output: textarea, min 1 char, max 5000, wymagane
  category: Select (API/Auth/CRUD/Pipeline/Reasoning/Home)
  target_model: Select (haiku/kimi/sonnet/codex/glm)
  is_active: Checkbox "Aktywne zadanie"
  ```
- Submit: `createEvalTask()` lub `updateEvalTask()` z serwisu
- Success: toast "Task dodany" / "Task zaktualizowany" + zamknij drawer + mutate
- Error: toast z polskim komunikatem błędu
- Loading state: disabled submit + spinner

### AC-4: Modal potwierdzenia usunięcia
- AlertDialog (shadcn): "Czy chcesz usunąć to zadanie testowe? Wszystkie powiązane wyniki runów zostaną utracone."
- Confirm → `deleteEvalTask(id)` → toast "Task usunięty" + mutate
- Cancel → bez zmian

### AC-5: RBAC w UI
- `useUserRole()` hook (STORY-7.2)
- `isAdmin = false` → ukryj przyciski add/edit/delete, wyświetl badge "Tryb podglądu"
- `isAdmin = true` → pełne UI
- Read-only tabela nadal wyświetla dane dla wszystkich

### AC-6: Integracja ze stroną eval
Zaktualizuj `app/(dashboard)/eval/page.tsx`:
- Dodaj `<CategoryFilter>` i `<EvalTasksTable>` w nowej sekcji
- Zachowaj istniejące `EvalFrameworkPanel` i `CostTrackerPanel` bez zmian
- Nowa sekcja: nagłówek "Golden Tasks" z przyciskiem "Dodaj task" (ADMIN)

### AC-7: TypeScript + Lint
`npx tsc --noEmit` → 0 błędów w nowych plikach
`npm run lint -- --quiet` → 0 warnings w nowych plikach

## ⚠️ Uwagi
- NIE modyfikuj `EvalFrameworkPanel` ani `CostTrackerPanel`
- Drawer pattern: `import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'`
- AlertDialog pattern: jak w `BulkActionBar.tsx` (EPIC-6)
- React Hook Form + Zod: jak w `PrdWizardModal.tsx` (EPIC-6) jeśli istnieje

## ✔️ DoD
- [ ] CategoryFilter działa i filtruje
- [ ] EvalTasksTable wyświetla dane + loading skeleton
- [ ] Drawer add/edit z walidacją Zod
- [ ] Modal delete z potwierdzeniem
- [ ] RBAC: non-ADMIN = read-only
- [ ] Integracja ze stroną eval (stare komponenty niezmienione)
- [ ] TS + Lint clean
- [ ] Commit na `feature/STORY-7.6`
