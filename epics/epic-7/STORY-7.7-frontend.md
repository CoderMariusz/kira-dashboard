---
story_id: STORY-7.7
title: "Info panel 'Co to jest Eval?' + onboarding tooltip"
epic: EPIC-7
domain: frontend
difficulty: easy
recommended_model: glm
priority: should
depends_on: []
blocks: []
---

## 🎯 Cel
Dodać kolapsowany panel informacyjny wyjaśniający cel golden tasks i systemu eval.
Widoczny dla wszystkich ról. Ikona ❓ przy nagłówku strony z inline popover.

## Kontekst
**Projekt:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Strona: `app/(dashboard)/eval/page.tsx`
Kolory: bg `#0d0c1a`, accent `#818cf8`, border `#2a2540`, text `#a0a0b8`

## ✅ Acceptance Criteria

### AC-1: Komponent `EvalInfoPanel`
Plik: `components/eval/EvalInfoPanel.tsx`

- Domyślnie zwinięty (`isOpen: false`)
- Przycisk toggle: `"ℹ️ Co to jest Eval?"` z ikoną chevron
- Po rozwinięciu pokazuje:
  ```
  🎯 Co to jest Eval?
  System Eval pozwala Mariuszowi testować czy Kira nadal działa poprawnie
  po zmianach w modelach lub kodzie.

  📋 Golden Tasks
  Zestaw zadań testowych z oczekiwanym outputem. Kira wykonuje je
  i porównuje wyniki — jeśli output się zmienił, jest to regresja.

  📊 Jak interpretować wyniki?
  ✅ PASS — output zgodny z oczekiwanym (diff_score ≥ 0.9)
  ❌ FAIL — output znacząco różni się od oczekiwanego
  🔴 Nowe FAILe vs poprzedni run — regresja wymagająca uwagi
  🟢 Naprawione PASSy — poprawa vs poprzedni run

  🏷️ Kategorie: API · Auth · CRUD · Pipeline · Reasoning · Home
  ```
- Animacja toggle: `max-height` transition 300ms ease
- Styl: `background: rgba(129,140,248,0.05)`, `border: 1px solid #2a2540`, `border-radius: 8px`, `padding: 16px`

### AC-2: Popover tooltip przy nagłówku
- Ikona `❓` obok nagłówka "Eval" na stronie
- Kliknięcie → shadcn `Popover` z krótkim opisem (2 zdania)
- Tekst: `"Golden Tasks to zadania testowe sprawdzające czy Kira odpowiada zgodnie z oczekiwaniami. Uruchom eval po każdej zmianie modelu."`
- Popover zamyka się po kliknięciu poza nim

### AC-3: Integracja ze stroną eval
Zaktualizuj `app/(dashboard)/eval/page.tsx`:
- `<EvalInfoPanel>` na górze strony (przed innymi komponentami)
- `❓` ikona w nagłówku strony obok tytułu "Eval"

### AC-4: TypeScript clean
`npx tsc --noEmit` → 0 błędów w nowych plikach

### AC-5: Dostępność
- `aria-expanded` na przycisku toggle
- `role="region"` i `aria-label="Informacje o systemie Eval"` na panelu

## ⚠️ Uwagi
- Popover: `import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'`
- Nie używaj `useState` jeśli można Radix Collapsible: `import { Collapsible } from '@/components/ui/collapsible'`
- STORY-7.7 może być równoległa z 7.6 i 7.8 — nie ma zależności od nich

## ✔️ DoD
- [ ] EvalInfoPanel kolapsuje/rozwija się
- [ ] Popover ❓ działa
- [ ] Integracja ze stroną eval
- [ ] TS clean
- [ ] Commit na `feature/STORY-7.7`
