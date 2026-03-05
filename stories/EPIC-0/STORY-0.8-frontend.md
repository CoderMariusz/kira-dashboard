---
story_id: STORY-0.8
title: "KiraBoard theme — CSS custom properties + theme entry"
epic: EPIC-0
module: infrastructure
domain: frontend
status: ready
difficulty: trivial
recommended_model: glm-5
priority: must
estimated_effort: 1h
depends_on: [STORY-0.1]
blocks: none
tags: [css, theme, frontend, branding]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć nowy theme "KiraBoard" w theme switcher LobsterBoard
**Żeby** dashboard wyglądał spójnie z marką KiraBoard (#0d0c1a, #818cf8 — dark purple/indigo)

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `css/builder.css` — dodanie bloku `[data-theme="kiraboard"]` na końcu
- `js/builder.js` — dodanie `"kiraboard"` do tablicy `THEMES`
- `index.html` / `app.html` — opcjonalnie: ustaw `data-theme="kiraboard"` jako domyślny

### Stan systemu przed tą story
- STORY-0.1 ukończona — repo sklonowane, `css/builder.css` istnieje
- LobsterBoard ma działający theme switcher z istniejącymi themes

---

## ✅ Acceptance Criteria

### AC-1: Theme dostępny w theme switcher
GIVEN: Serwer uruchomiony
WHEN: Otworzysz theme switcher w dashboardzie
THEN: Widoczna opcja "KiraBoard" (lub "kiraboard") na liście themes

### AC-2: Aplikacja theme zmienia kolory
GIVEN: Theme switcher widoczny
WHEN: Wybierzesz theme "KiraBoard"
THEN: Tło dashboardu zmienia się na ciemny fiolet (#0d0c1a), akcenty na indigo (#818cf8)

### AC-3: CSS custom properties obecne
GIVEN: `css/builder.css` zmodyfikowany
WHEN: Otworzysz DevTools → Computed styles na body gdy theme=kiraboard
THEN: `--bg-primary: #0d0c1a`, `--accent: #818cf8` widoczne w CSS variables

---

## 🔧 Szczegóły implementacji

### `css/builder.css` — nowy blok na końcu

```css
/* KiraBoard Theme */
[data-theme="kiraboard"] {
  --bg-primary: #0d0c1a;
  --bg-secondary: #1a1730;
  --bg-card: #1a1730;
  --bg-input: #151326;
  --bg-hover: #252040;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent: #818cf8;
  --accent-hover: #6366f1;
  --accent-dim: rgba(129, 140, 248, 0.15);
  --border: #2a2540;
  --border-hover: #3b3d7a;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;
  --info: #38bdf8;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  --radius: 12px;
  --sidebar-bg: #0a0918;
  --header-bg: #0d0c1a;
}
```

### `js/builder.js` — dodaj do THEMES array

```javascript
// Znajdź istniejącą tablicę THEMES i dodaj 'kiraboard'
const THEMES = ['default', 'feminine', 'feminine-dark', 'terminal', 'paper', 'kiraboard'];
```

### Opcjonalnie — domyślny theme

W `index.html` i `app.html`:
```html
<body data-theme="kiraboard">
```

---

## ⚠️ Edge Cases

### EC-1: Brak zmiennej CSS używanej przez widget
Scenariusz: Widget LobsterBoard używa zmiennej którą nowy theme nie definiuje
Oczekiwane zachowanie: Przeglądarka fallbackuje do poprzedniej wartości / dziedziczenia — sprawdź wizualnie czy wszystkie 50 widgetów wyglądają poprawnie

### EC-2: Theme wybrany przez usera zapisany w localStorage
Scenariusz: User wcześniej wybrał inny theme, zapisany w localStorage
Oczekiwane zachowanie: LobsterBoard przywraca zapisany theme — KiraBoard nie nadpisuje jeśli user ma preferencję

---

## 🚫 Out of Scope tej Story
- Responsive mobile CSS
- Animacje i transitions
- Dark/Light toggle
- Per-widget custom colors

---

## ✔️ Definition of Done
- [ ] `[data-theme="kiraboard"]` CSS block dodany do `css/builder.css`
- [ ] Wszystkie 16 CSS custom properties zdefiniowane
- [ ] `"kiraboard"` dodane do `THEMES` array w `js/builder.js`
- [ ] Theme widoczny w theme switcher
- [ ] Po wyborze theme — dashboard ma tło #0d0c1a i akcenty #818cf8
- [ ] Wszystkie istniejące widgety LobsterBoard działają z nowym theme (brak broken layout)
