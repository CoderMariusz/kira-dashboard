---
story_id: STORY-9.2
title: "NightClaw dashboard — ostatni digest + model stats + lessons"
epic: EPIC-9
module: nightclaw
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-9.1, STORY-3.3]
blocks: []
tags: [page, dashboard, markdown, recharts, nightclaw, admin]
---

## 🎯 User Story

**Jako** Mariusz (admin)
**Chcę** mieć stronę NightClaw która rano pokazuje mi ostatni digest, statystyki modeli i lekcje w jednym miejscu
**Żeby** w 30 sekund wiedzieć co Kira robiła w nocy i czy cokolwiek wymaga mojej interwencji

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/nightclaw` (strona główna NightClaw module)
- Plik: `/app/nightclaw/page.tsx`
- Layout: `/app/nightclaw/layout.tsx` (auth guard: tylko rola `admin`)
- Komponenty: `/components/nightclaw/`

### Powiązane pliki
- API: `GET /api/nightclaw/digest` → ostatni digest (Markdown string)
- API: `GET /api/nightclaw/stats` → model-stats.json
- API: `GET /api/nightclaw/lessons` → LESSONS_LEARNED.md (Markdown string)
- Zależność: STORY-3.3 auth guard (redirect dla nie-adminów)

### Stan systemu przed tą story
- STORY-9.1 dostarcza 3 endpointy (`/api/nightclaw/digest`, `/api/nightclaw/stats`, `/api/nightclaw/lessons`)
- STORY-3.3 dostarcza `AdminGuard` lub middleware auth check
- `react-markdown` + `remark-gfm` zainstalowane (`npm install react-markdown remark-gfm`)
- `recharts` zainstalowane (EPIC-5 / wcześniejszy epic)
- shadcn/ui Card, Badge, Skeleton dostępne

---

## ✅ Acceptance Criteria

### AC-1: Auth guard — redirect dla nie-adminów
GIVEN: użytkownik zalogowany z rolą `home` lub `home_plus` próbuje wejść na `/nightclaw`
WHEN: strona się ładuje
THEN: następuje redirect na `/dashboard` z komunikatem toast "Brak uprawnień. Strona dostępna tylko dla administratora."

### AC-2: Digest rendering — ostatni plik
GIVEN: admin wchodzi na `/nightclaw`, endpoint `GET /api/nightclaw/digest` zwraca poprawne dane
WHEN: strona załaduje się
THEN: widoczna sekcja "📋 Digest [data]" z wyrenderowanym Markdown (react-markdown + remark-gfm)
AND: nagłówki, listy, bold, code blocks są prawidłowo ostylowane (Tailwind Typography lub własne klasy)
AND: widoczna data digestu w tytule sekcji (format `DD.MM.YYYY`)

### AC-3: Model stats — bar chart
GIVEN: `GET /api/nightclaw/stats` zwraca dane z kluczem `models`
WHEN: strona załaduje dane
THEN: widoczna sekcja "📊 Statystyki Modeli" z Recharts `BarChart`
AND: każdy model pokazany jako bar z success_rate (0–1 → 0–100%)
AND: nazwy modeli skrócone (np. `claude-sonnet-4-6` zamiast pełnej ścieżki `anthropic/...`)
AND: kolor baru: zielony gdy success_rate ≥ 0.8, żółty gdy 0.5–0.79, czerwony gdy < 0.5
AND: hover tooltip pokazuje: pełna nazwa modelu, success_rate %, stories_completed, stories_failed

### AC-4: Lessons panel
GIVEN: `GET /api/nightclaw/lessons` zwraca content Markdown
WHEN: strona załaduje dane
THEN: widoczna sekcja "📚 Lessons Learned" z wyrenderowanym Markdown (react-markdown)
AND: sekcja jest domyślnie zwinięta (collapsed) z przyciskiem "Pokaż lekcje" / "Ukryj lekcje"

### AC-5: Loading states
GIVEN: admin wchodzi na `/nightclaw`, dane są pobierane
WHEN: trwa ładowanie (promise niezresolwowany)
THEN: każda sekcja (digest, stats, lessons) pokazuje Skeleton placeholder
AND: strona nie rzuca błędem JS w konsoli podczas ładowania

### AC-6: Error state
GIVEN: endpoint `/api/nightclaw/digest` zwraca 404 lub 500
WHEN: fetch zakończy się błędem
THEN: sekcja Digest pokazuje komunikat "Brak digestu NightClaw. Sprawdź czy NightClaw uruchamiał się w nocy."
AND: pozostałe sekcje (stats, lessons) próbują się załadować niezależnie

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/nightclaw`
Komponent główny: `NightClawPage` (`/app/nightclaw/page.tsx`)
Plik layout: `/app/nightclaw/layout.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `DigestViewer` | Card | `content: string`, `date: string` | loading/error/empty/filled |
| `ModelStatsChart` | Card+BarChart | `stats: StatsResponse` | loading/error/empty/filled |
| `LessonsPanel` | Card (collapsible) | `content: string`, `lastUpdated: string` | loading/error/collapsed/expanded |
| `NightClawPage` | Page | — | loading/error/filled |

### Stany widoku

**Loading:**
- Każda sekcja (DigestViewer, ModelStatsChart, LessonsPanel) pokazuje `Skeleton` z Tailwind animate-pulse
- Skeleton dla DigestViewer: 3 linie tekstu o różnych szerokościach
- Skeleton dla ModelStatsChart: prostokąt 300px wysokości
- LessonsPanel: 2 linie skeleton

**Empty (brak danych):**
DigestViewer: `<p className="text-muted-foreground">Brak digestu NightClaw. Sprawdź czy NightClaw uruchamiał się w nocy.</p>`
ModelStatsChart: `<p className="text-muted-foreground">Brak danych statystycznych.</p>`
LessonsPanel: `<p className="text-muted-foreground">Brak lekcji do wyświetlenia.</p>`

**Error (błąd serwera/sieci):**
Każda sekcja niezależnie: inline error message z ikoną ⚠️ + przycisk "Spróbuj ponownie"
Tekst: "Nie udało się załadować danych. [Spróbuj ponownie]"

**Filled (normalny stan):**
- Header strony: tytuł "🦇 NightClaw" + data ostatniego digestu + badge status (zielony/czerwony)
- Sekcja 1: DigestViewer — Card z rendered Markdown, max-height: 600px, overflow-y: auto
- Sekcja 2: ModelStatsChart — Card z BarChart (Recharts), wysokość 300px
- Sekcja 3: LessonsPanel — Card collapsible z rendered Markdown

### Flow interakcji

```
1. Admin wchodzi na /nightclaw → layout.tsx sprawdza rolę
2. Rola != admin → redirect /dashboard + toast błędu
3. Rola == admin → renderuje NightClawPage
4. Page mount → 3 równoległe fetch (digest, stats, lessons) za pomocą Promise.allSettled
5. Każda sekcja inicjalnie w stanie loading (Skeleton)
6. Fetch zakończony OK → sekcja przechodzi do stanu filled
7. Fetch zakończony błędem → sekcja przechodzi do stanu error z przyciskiem retry
8. Użytkownik klika "Spróbuj ponownie" → ponowny fetch tylko dla tej sekcji
9. Użytkownik klika "Pokaż lekcje" → LessonsPanel expand/collapse z animacją
```

### Recharts — ModelStatsChart config
```tsx
<BarChart data={chartData} width={500} height={300}>
  <XAxis dataKey="name" />
  <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
  <Tooltip content={<CustomTooltip />} />
  <Bar dataKey="success_rate" fill={colorByRate} radius={[4, 4, 0, 0]} />
</BarChart>
```
Skracanie nazwy modelu: `name.split('/').pop()?.replace('claude-', '').replace('anthropic/', '')`

### Responsive / Dostępność
- Mobile (375px+): sekcje układają się w kolumnę, chart responsywny (`ResponsiveContainer`)
- Desktop (1280px+): grid 2-kolumnowy (digest po lewej, stats+lessons po prawej)
- Keyboard: przycisk "Pokaż/Ukryj lekcje" dostępny z klawiatury (Enter/Space)
- ARIA: `aria-expanded` na przycisku toggle LessonsPanel; `aria-label="Statystyki modeli AI"` na chart container

---

## ⚠️ Edge Cases

### EC-1: Model z success_rate 0 (wszystkie stories failed)
Scenariusz: model ma `stories_failed > 0` i `stories_completed = 0`
Oczekiwane zachowanie: bar wyświetlany kolorem czerwonym (0%), tooltip pokazuje "0% success — N stories failed"

### EC-2: Digest zawiera kod blokowy z długimi liniami
Scenariusz: Markdown digest zawiera ```bash z długim poleceniem (>200 znaków)
Oczekiwane zachowanie: blok kodu ma `overflow-x: auto`, nie łamie layoutu strony

### EC-3: Brak danych stats (plik model-stats.json pusty lub `{ models: {} }`)
Scenariusz: model-stats.json istnieje ale nie ma żadnych modeli
Oczekiwane zachowanie: sekcja ModelStatsChart pokazuje stan "empty" — "Brak danych statystycznych."

### EC-4: Bardzo długi Markdown lessons (>10k znaków)
Scenariusz: LESSONS_LEARNED.md jest duży (wiele bugów, wiele sekcji)
Oczekiwane zachowanie: LessonsPanel jest domyślnie collapsed; po expand — scroll wewnątrz Card (max-height: 500px, overflow-y: auto)

---

## 🚫 Out of Scope tej Story
- Digest history (lista wszystkich digestów) — to STORY-9.3
- Lessons filtering/search — to STORY-9.4
- Calendar heatmap (zdefiniowane w EPIC-9.md ale poza zakresem task brief)
- Skills diff viewer (poza zakresem task brief)
- Edycja lub triggerowanie NightClaw z UI

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled) dla każdej sekcji
- [ ] Auth guard działa — rola `home`/`home_plus` jest redirectowana
- [ ] BarChart renderuje się bez błędów, tooltip działa
- [ ] Markdown rendering nie łamie layoutu (code blocks, nagłówki, listy)
- [ ] LessonsPanel collapse/expand działa z animacją
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe
- [ ] Story review przez PO
