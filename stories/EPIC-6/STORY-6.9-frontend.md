---
story_id: STORY-6.9
title: "Skills page — lista skilli OpenClaw, status, last-used"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 4h
depends_on: [STORY-6.10]
blocks: []
tags: [skills, openclaw, list, cards, last-used, search]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć listę zainstalowanych skilli OpenClaw z datą ostatniego użycia i statusem
**Żeby** monitorować które skille są aktywnie używane i zarządzać nimi bez terminala

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/skills`
- Komponent główny: `SkillsPage`
- Plik: `src/pages/skills/index.tsx`
- API: `GET /api/skills/installed` (z STORY-6.10)

### Powiązane pliki
- `src/_shared/lib/skillsApi.ts` — serwis API
- `GET /api/skills/installed` — endpoint z STORY-6.10
- Router: trasa `/skills` zdefiniowana
- Sidebar ma link do `/skills`

### Stan systemu przed tą story
- STORY-6.10 gotowe: API `/api/skills/installed` zwraca listę skilli z last-used datą
- shadcn/ui Card, Badge, Input, Tabs zainstalowane

---

## ✅ Acceptance Criteria

### AC-1: Grid kart zainstalowanych skilli
GIVEN: OpenClaw ma 15 zainstalowanych skilli (kira-orchestrator, apple-notes, weather, etc.)
WHEN: Mariusz wchodzi na `/skills`
THEN: strona wyświetla grid kart skilli, każda z: nazwa, opis (z SKILL.md description), data ostatniego użycia, badge "Aktywny" lub "Nieużywany" (>30 dni bez użycia)

### AC-2: Search filtruje listę skilli
GIVEN: lista 15 skilli jest wyświetlona
WHEN: Mariusz wpisuje "kira" w pole wyszukiwania
THEN: lista filtruje się w czasie rzeczywistym do skilli zawierających "kira" w nazwie lub opisie
AND: counter "4 skilli" aktualizuje się

### AC-3: Last-used data i badge
GIVEN: skill `apple-notes` był ostatnio użyty 5 dni temu, skill `openai-whisper` 45 dni temu
WHEN: karty są wyświetlone
THEN: `apple-notes` ma badge "Aktywny" z "ostatnio: 5 dni temu"
AND: `openai-whisper` ma badge "Nieużywany" (szary) z "ostatnio: 45 dni temu"
AND: skille bez żadnego użycia mają "Nigdy nie użyty"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/skills`
Komponent: `SkillsPage`
Plik: `src/pages/skills/index.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `SkillsPage` | Page | — | loading, empty, error, filled |
| `SkillSearchInput` | Input | `value`, `onChange` | idle, typing |
| `SkillCard` | Card | `skill` | active, inactive, never-used |
| `SkillStatusBadge` | Badge | `lastUsed`, `daysAgo` | active (blue), inactive (gray) |
| `SkillCountLabel` | Text | `count`, `total` | — |

### Stany widoku

**Loading:**
Grid skeleton: 8 kart placeholder (animacja pulse).

**Empty (brak skilli / filtr nie pasuje):**
Brak zainstalowanych: "Brak skilli OpenClaw. Zainstaluj skille przez `openclaw skill install <name>`"
Brak wyników search: "Brak skilli pasujących do '[query]'" z linkiem "Wyczyść filtr".

**Error:**
Alert: "Nie można załadować skilli — sprawdź czy OpenClaw jest uruchomiony" z przyciskiem retry.

**Filled:**
Search input + counter "15 skilli" → grid kart 2-4 kolumny.

### Flow interakcji

```
1. Mariusz wchodzi na /skills → skeleton loading
2. API zwraca listę skilli → grid kart
3. Mariusz wpisuje w search → lista filtruje się real-time (debounce 200ms)
4. Mariusz klika na kartę skilla → nic (tylko informacyjny widok w tej story)
```

### Responsive / Dostępność
- Mobile (375px+): 1 kolumna, search na pełną szerokość
- Tablet (768px+): 2 kolumny
- Desktop (1280px+): 3-4 kolumny grid
- Keyboard navigation: Tab przez karty, search accessible z klawiatury
- ARIA: grid `role="list"`, karty `role="listitem"`, search z `aria-label="Szukaj skilli"`

---

## ⚠️ Edge Cases

### EC-1: skill-usage.log nie istnieje
Scenariusz: OpenClaw zainstalowany ale skill-usage.log jeszcze nie istnieje (zero użyć)
Oczekiwane zachowanie: wszystkie skille mają "Nigdy nie użyty" — strona działa normalnie

### EC-2: Skill bez opisu (brak SKILL.md description)
Scenariusz: skill zainstalowany ale SKILL.md nie ma pola description
Oczekiwane zachowanie: opis zastąpiony przez "Brak opisu" (szary tekst italic)

---

## 🚫 Out of Scope tej Story
- Install/uninstall skilli z UI (poza zakresem tej story — przyszłe rozszerzenie)
- Tabs Installed/Available/Community (uproszczono do tylko Installed)
- Skill detail page
- Skill config edycja

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane
- [ ] Search filtruje real-time z debounce 200ms
- [ ] Last-used badge poprawnie rozróżnia aktywny (≤30 dni) od nieużywany (>30 dni)
- [ ] "Nigdy nie użyty" dla skilli bez wpisów w usage log
- [ ] Grid responsive: 1/2/3-4 kolumny
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty po polsku
- [ ] Story review przez PO
