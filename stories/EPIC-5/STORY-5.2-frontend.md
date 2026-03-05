---
story_id: STORY-5.2
title: "Models list view — karty modeli z usage stats + provider badge"
epic: EPIC-5
module: models
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: none
api_reference: /app/api/models/route.ts
priority: must
estimated_effort: 6h
depends_on: [STORY-5.1, STORY-3.3]
blocks: [STORY-5.3]
tags: [models, cards, stats, shadcn, react]
---

## 🎯 User Story

**Jako** Mariusz (admin)
**Chcę** widzieć listę wszystkich modeli AI w formie kart z ich statystykami użycia
**Żeby** szybko ocenić które modele są aktywne, ile kosztują i jaki mają success rate

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/models` (plik: `app/models/page.tsx`)
Komponenty: `ModelsList`, `ModelCard`, `ProviderBadge`, `StatsRow`, `DaysToggle`
Layout: chroniony przez admin guard z EPIC-3

### Powiązane pliki
- `app/models/page.tsx` — główna strona Models
- `app/models/components/ModelsList.tsx` — lista kart
- `app/models/components/ModelCard.tsx` — karta pojedynczego modelu
- `app/models/components/ProviderBadge.tsx` — badge provider (Anthropic/OpenAI/Moonshot/ZhipuAI)
- `app/_shared/lib/models-api.ts` — API client (zakłada istnienie po STORY-5.2)
- `app/api/models/route.ts` — backend endpoint (STORY-5.1)

### Stan systemu przed tą story
- STORY-5.1 gotowy: `GET /api/models?days=7|30` zwraca dane
- STORY-3.3 gotowy: auth middleware blokuje nieadminów na `/models`
- shadcn/ui zainstalowany: `Card`, `CardHeader`, `CardContent`, `Badge`, `Skeleton`, `Button`
- Tailwind skonfigurowany

---

## ✅ Acceptance Criteria

### AC-1: Strona /models ładuje i wyświetla karty modeli
GIVEN: zalogowany admin wchodzi na `/models`
WHEN: `GET /api/models?days=7` zwraca 200 z listą 6 modeli
THEN: widok wyświetla 6 kart — po jednej per model, w układzie grid 3-kolumnowym na desktop
AND: każda karta zawiera: nazwę modelu, alias, provider badge, status indicator (zielony/szary), success rate %, avg duration, total cost USD

### AC-2: ProviderBadge wyświetla właściwy kolor per provider
GIVEN: karta modelu z `provider: "anthropic"`
WHEN: karta jest wyrenderowana
THEN: badge ma kolor pomarańczowy z napisem "Anthropic"
AND: `provider: "openai"` → zielony "OpenAI"; `provider: "moonshot"` → niebieski "Moonshot"; `provider: "zhipu"` → fioletowy "ZhipuAI"

### AC-3: Toggle 7d/30d przelicza statystyki
GIVEN: admin widzi listę kart z danymi za 7 dni (domyślnie)
WHEN: klika przełącznik "30d" w nagłówku strony
THEN: wywoływany jest `GET /api/models?days=30`, karty aktualizują się nowymi wartościami stats
AND: podczas ładowania karty pokazują stan skeleton (shadcn Skeleton na polach stats)

### AC-4: Stan loading — karty placeholder podczas ładowania
GIVEN: admin wchodzi na `/models`
WHEN: request do `GET /api/models` jest w toku (< 2s)
THEN: wyświetlane są 6 kart-placeholderów ze Skeleton na polach tekstowych
AND: po załadowaniu skeleton zastępowane są prawdziwymi danymi bez przeładowania strony

### AC-5: Model bez danych statystycznych wyświetla "—"
GIVEN: model z `stats.total_runs: 0` i `stats.success_rate: null`
WHEN: karta jest wyrenderowana
THEN: pola `success_rate` i `avg_duration_seconds` pokazują "—" zamiast 0%/0s
AND: `total_cost_usd: 0` wyświetla się jako "$0.00"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/models`
Komponent: `ModelsPage → ModelsList → ModelCard`
Plik: `app/models/page.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `ModelsPage` | Page | — | loading, error, filled |
| `ModelsList` | Container | `models: ModelWithStats[]`, `isLoading: boolean` | loading (skeletons), empty, filled |
| `ModelCard` | Card (shadcn) | `model: ModelWithStats` | default, inactive (szary) |
| `ProviderBadge` | Badge (shadcn) | `provider: string` | — |
| `DaysToggle` | Button group | `value: 7\|30`, `onChange` | active/inactive |
| `StatsRow` | div | `label`, `value`, `unit?` | — |

### Stany widoku

**Loading:**
Wyświetlane są 6 kart-placeholderów (pełne wymiary). W każdej karcie: Skeleton 120px × 20px na nazwę, Skeleton 60px × 16px na badge, 3× Skeleton 100px × 14px na stats. Toggle `7d/30d` jest zablokowany (disabled).

**Empty (brak danych):**
Tekst: "Brak modeli — sprawdź konfigurację Bridge"
Subtext: "Upewnij się że Bridge API działa i zwraca listę modeli"
CTA: brak (to konfiguracja systemowa)

**Error (błąd serwera/sieci):**
Alert box (shadcn Alert, variant destructive): "Nie można załadować modeli"
Subtext: "Sprawdź połączenie z Bridge API"
Przycisk: "Spróbuj ponownie" — ponawia fetch

**Filled (normalny stan):**
Grid 3-kolumnowy (lg:grid-cols-3, md:grid-cols-2, sm:grid-cols-1). Każda karta ma header z nazwą+badge, sekcję stats (3 metryki), footer z kosztem.

### Layout karty (ModelCard)

```
┌─────────────────────────────────┐
│ ● sonnet-4.6    [Anthropic] 🟢  │  ← nazwa + provider badge + status dot
│ alias: sonnet                   │
├─────────────────────────────────┤
│ Success rate:  94.2%            │
│ Avg duration:  12.3s            │
│ Total runs:    47               │
├─────────────────────────────────┤
│ Cost (7d):     $3.24         →  │  ← kliknięcie otwiera ModelDetail (STORY-5.3)
└─────────────────────────────────┘
```

Status dot: zielony (active), szary (inactive)
Cała karta jest klikalnym elementem → otwiera ModelDetailPanel (STORY-5.3, ale karta sama w sobie nie implementuje panelu — przekazuje callback `onSelect`)

### Flow interakcji (krok po kroku)

```
1. Admin wchodzi na /models → ModelsPage montuje się → wywoływany fetch GET /api/models?days=7
2. Podczas fetch → ModelsList renderuje 6 skeleton kart
3. Fetch zakończony sukcesem → ModelsList rerenderuje z prawdziwymi danymi
4. Admin klika "30d" w DaysToggle → onChange wywoływany → nowy fetch GET /api/models?days=30 → skeleton → dane
5. Admin klika kartę modelu → onSelect(model) wywoływany → STORY-5.3 obsługuje panel
6. Fetch kończy się błędem → wyświetlany jest Alert z "Spróbuj ponownie"
```

### Responsive / Dostępność
- Mobile (375px+): 1-kolumnowy grid, karty pełna szerokość
- Tablet (768px+): 2-kolumnowy grid
- Desktop (1280px+): 3-kolumnowy grid
- Keyboard navigation: Tab przechodzi po kartach; Enter/Space na karcie → otwiera detail
- ARIA: każda karta ma `role="button"` i `aria-label="Model {name}, kliknij aby zobaczyć szczegóły"`

---

## ⚠️ Edge Cases

### EC-1: Bridge zwraca model z nieznanym providerem
Scenariusz: `provider` ma wartość np. "custom" nieobsługiwaną przez ProviderBadge
Oczekiwane zachowanie: wyświetla szary badge z napisem "Unknown"
Komunikat dla użytkownika: brak (nie blokuje widoku)

### EC-2: Zbyt długa nazwa modelu
Scenariusz: `name` modelu ma > 20 znaków
Oczekiwane zachowanie: tekst jest obcinany z `truncate` (CSS) — karta nie rozjeżdża layoutu
Komunikat dla użytkownika: pełna nazwa widoczna w `title` attribute (tooltip)

### EC-3: Wszystkie modele mają status inactive
Scenariusz: Bridge zwraca wszystkie modele ze statusem `inactive`
Oczekiwane zachowanie: wszystkie karty wyświetlają szary status dot i obniżoną opacity (np. `opacity-60`)
Komunikat dla użytkownika: żaden toast/alert — to poprawny stan (może być celowe)

---

## 🚫 Out of Scope tej Story
- ModelDetailPanel (otwierany po kliknięciu karty) — STORY-5.3
- Inline edycja kosztu tokenów — STORY-5.4 (po kliknięciu kosztu)
- Monitoring toggle switch na karcie — STORY-5.4
- Usage chart (Recharts) — nie w tej story, osobny komponent w STORY-5.3

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading skeletons, empty, error, filled)
- [ ] Karty wyświetlają poprawne dane per model (name, alias, provider, status, stats)
- [ ] DaysToggle 7d/30d działa — zmiana wywołuje nowy fetch i aktualizuje karty
- [ ] ProviderBadge ma właściwy kolor dla Anthropic/OpenAI/Moonshot/ZhipuAI
- [ ] Widok działa na mobile 375px bez horizontal scroll (1-kol grid)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Keyboard navigation: Tab + Enter/Space otwiera detail
- [ ] Kod przechodzi linter bez błędów (ESLint + TypeScript strict)
- [ ] Story review przez PO
