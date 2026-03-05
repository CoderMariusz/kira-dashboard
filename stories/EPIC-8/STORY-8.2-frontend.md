---
story_id: STORY-8.2
title: "Patterns list view — karty patterns z kategorią, tagami, severity"
epic: EPIC-8
module: patterns
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-8.1, STORY-3.3]
blocks: [STORY-8.3]
tags: [list-view, cards, tags, severity, filter, shadcn, react]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** przeglądać patterns i anti-patterns z NightClaw jako karty na stronie `/patterns`
**Żeby** szybko skanować zebrane wzorce, identyfikować severity i filtrować po kategorii lub tagach

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/patterns`
Komponent: `PatternsBrowser`
Plik: `/app/patterns/page.tsx` + `/components/patterns/PatternsBrowser.tsx`

### Powiązane pliki
API: `GET /api/patterns` (STORY-8.1)
Auth guard: STORY-3.3 (redirect gdy rola != admin)

### Stan systemu przed tą story
- STORY-8.1 gotowa: `GET /api/patterns` zwraca `{ patterns: PatternEntry[], antiPatterns: PatternEntry[] }`
- STORY-3.3 gotowa: auth guard aktywny na stronie `/patterns`
- `PatternEntry` type dostępny w shared types

---

## ✅ Acceptance Criteria

### AC-1: Strona /patterns wyświetla wszystkie patterns jako karty
GIVEN: użytkownik z rolą `admin` jest zalogowany i wchodzi na `/patterns`
WHEN: strona się ładuje (wywołuje GET /api/patterns)
THEN: wyświetlona jest siatka/lista kart — osobno sekcja "Patterns ✅" i "Anti-patterns ❌"; każda karta zawiera: tytuł, kategorię (H2 badge), severity badge (kolorowy), pierwsze 150 znaków treści, tagi jako badge'y

### AC-2: Severity badge ma odpowiedni kolor
GIVEN: lista patterns i anti-patterns załadowana
WHEN: użytkownik widzi karty
THEN: severity `info` = badge niebieski/szary; `warning` = badge żółty/pomarańczowy; `critical` = badge czerwony

### AC-3: Klik tagu filtruje listę
GIVEN: użytkownik widzi listę patterns
WHEN: klika tag np. "Pipeline" na którejkolwiek karcie
THEN: lista filtruje się do kart zawierających ten tag (OR logic jeśli wiele tagów zaznaczonych); aktywne tagi pokazane jako "aktywne" (np. filled vs outline badge); klik ponownie → odznacza tag

### AC-4: Reset filtrów
GIVEN: użytkownik ma zaznaczone 1+ tagów
WHEN: klika "Resetuj filtry" (lub "×" przy aktywnym tagu)
THEN: wszystkie karty wracają do widoku; aktywne tagi wyzerowane

### AC-5: Strona jest zabezpieczona
GIVEN: użytkownik z rolą `home` (nie admin) wchodzi na `/patterns`
WHEN: strona się ładuje
THEN: użytkownik jest redirectowany na `/dashboard`; strona patterns NIE renderuje żadnych danych

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/patterns`
Komponent: `PatternsBrowser`
Plik: `/app/patterns/page.tsx` (Server Component z auth check) + `/components/patterns/PatternsBrowser.tsx` (Client Component)

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `PatternsBrowser` | Client Component | `patterns`, `antiPatterns` | loading, empty, filled, filtered |
| `PatternCard` | Card | `entry: PatternEntry`, `activeTags`, `onTagClick` | normal, filtered-out |
| `SeverityBadge` | Badge (shadcn) | `severity: "info"\|"warning"\|"critical"` | — |
| `CategoryBadge` | Badge (shadcn) | `category: string` | — |
| `TagBadge` | Badge (shadcn) | `tag: string`, `active: boolean`, `onClick` | active, inactive |

### Stany widoku

**Loading:**
Skeleton cards — 6 kart skeleton (3 po lewej, 3 po prawej lub 6 w grid); nagłówek "Patterns" i "Anti-patterns" widoczny; shadcn `Skeleton` component

**Empty (brak danych):**
Komunikat: "Brak patterns do wyświetlenia. Sprawdź konfigurację NIGHTCLAW_DIR."
CTA: brak (read-only strona)

**Error (błąd serwera/sieci):**
Komunikat: "Nie udało się załadować patterns. Spróbuj odświeżyć stronę."
Przycisk: "Odśwież" (wywołuje ponowny fetch)

**Filled (normalny stan):**
Dwie sekcje z licznikami: "Patterns ✅ (18)" i "Anti-patterns ❌ (32)"
Grid kart z filtrowaniem po tagach
Górna belka z aktywnymi tagami i przyciskiem reset

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na /patterns → auth check (serwer-side); brak admina → redirect /dashboard
2. Dane ładowane (GET /api/patterns) → stan loading: skeleton cards
3. Dane załadowane → wyświetl dwie sekcje z kartami
4. Użytkownik klika tag na karcie → tag dodany do activeTags[]; lista filtruje się po client-side
5. Użytkownik klika aktywny tag ponownie → tag usunięty z activeTags[]
6. Użytkownik klika "Resetuj filtry" → activeTags = []; pełna lista
7. Błąd API → komunikat błędu + przycisk "Odśwież"
```

### Responsive / Dostępność
- Mobile (375px+): 1 kolumna kart; tagi jako wrapping chips pod sobą
- Tablet (768px+): 2 kolumny kart
- Desktop (1280px+): 3 kolumny kart; lewa kolumna sidebar z filtrami tagów (opcjonalnie: chips inline)
- Keyboard navigation: Tab między kartami; Enter/Space na tagu → toggle; Escape → reset filtrów
- ARIA: `aria-label="Filtruj po tagu: Pipeline"` na tag badge'ach; `aria-pressed` (true/false) dla aktywnych tagów; `role="list"` na kontenerze kart

---

## ⚠️ Edge Cases

### EC-1: Brak tagów w odpowiedzi API
Scenariusz: API zwraca PatternEntry z pustą tablicą `tags: []`
Oczekiwane zachowanie: karta renderuje się bez sekcji tagów (nie ma pustego bloku); filtrowanie tagów nadal działa dla kart które mają tagi

### EC-2: Bardzo długi tytuł lub treść
Scenariusz: tytuł wpisu ma >100 znaków, treść >500 znaków
Oczekiwane zachowanie: tytuł skrócony z CSS `line-clamp-2`; treść pokazana max 150 znaków z "..."; karta nie rozrywa layoutu gridu

### EC-3: Filtrowanie zwraca 0 wyników
Scenariusz: użytkownik zaznaczył tag który nie ma pasujących kart (np. po oczyszczeniu danych)
Oczekiwane zachowanie: wyświetlony komunikat "Brak wyników dla wybranych tagów. [Resetuj filtry]"; przycisk reset aktywny

### EC-4: Ładowanie trwa >3 sekundy
Scenariusz: plik patterns.md jest bardzo duży lub serwer powolny
Oczekiwane zachowanie: skeleton cards widoczne cały czas do momentu załadowania; brak timeout error po stronie klienta (timeout po 30s)

---

## 🚫 Out of Scope tej Story
- Klik w kartę → widok szczegółowy (to STORY-8.3)
- Full-text search input (to STORY-8.4)
- Dodawanie nowych patterns przez formularz — poza zakresem EPIC-8 w tej wersji
- Edycja i usuwanie patterns

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Walidacja formularza działa przed submitem i po każdym polu (jeśli real-time)
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Sekcje "Patterns" i "Anti-patterns" wyraźnie rozdzielone
- [ ] Severity badges mają poprawne kolory (info=niebieski, warning=żółty, critical=czerwony)
- [ ] Filtrowanie po tagach działa client-side (bez API call)
- [ ] Strona `/patterns` redirectuje non-admin na `/dashboard`
- [ ] Story review przez PO
