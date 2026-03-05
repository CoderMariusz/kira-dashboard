---
story_id: STORY-3.2
title: "Role-based sidebar — filtrowanie nav items per rola"
epic: EPIC-3
module: auth
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-3.3]
blocks: []
tags: [sidebar, navigation, roles, frontend, conditional-render]
---

## 🎯 User Story

**Jako** użytkownik KiraBoard zalogowany z określoną rolą
**Chcę** widzieć w sidebarze tylko te pozycje nawigacyjne, do których mam dostęp
**Żeby** interfejs był przejrzysty i nie pokazywał mi sekcji developerskich których nie używam

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Komponent: sidebar HTML w `public/index.html` (LobsterBoard nav)
- Plik logiki: `public/js/sidebar.js` (nowy lub rozszerzony)
- Trigger: po każdym załadowaniu strony + po zdarzeniu `kb:auth:changed`
- Dane roli: odczytywane z `localStorage.getItem('kb_token')` → dekodowanie JWT (base64, bez biblioteki)

### Powiązane pliki
- `public/index.html` — sidebar HTML: `<nav id="kb-sidebar">` z listą `<a>` linków
- `public/js/sidebar.js` — logika warunkowego renderowania
- `public/js/auth-modal.js` — emituje zdarzenie `kb:auth:changed` po zalogowaniu/wylogowaniu

### Stan systemu przed tą story
- STORY-3.3 gotowa: middleware JWT weryfikuje token, route protection działa server-side
- STORY-3.1 gotowa: użytkownik może się zalogować, token jest w localStorage
- Sidebar HTML istnieje w `public/index.html` z pozycjami nawigacyjnymi

---

## ✅ Acceptance Criteria

### AC-1: Admin widzi pełny sidebar (9 pozycji)
GIVEN: Użytkownik zalogowany z rolą `admin` (token w localStorage, rola zdekodowana)
WHEN: Strona się ładuje lub sidebar jest odświeżany
THEN: Sidebar wyświetla wszystkie 9 pozycji w kolejności: Dashboard, Pipeline, Models, Eval, NightClaw, Patterns, Chat, Home, Settings
AND: Każda pozycja jest widoczna jako klikalny link prowadzący do odpowiedniej trasy

### AC-2: home_plus widzi ograniczony sidebar (2 pozycje)
GIVEN: Użytkownik zalogowany z rolą `home_plus` (np. Angelika)
WHEN: Strona się ładuje
THEN: Sidebar wyświetla tylko 2 pozycje: Home, Chat
AND: Pozycje: Dashboard, Pipeline, Models, Eval, NightClaw, Patterns, Settings są **ukryte** (nie greyed out — całkowicie usunięte z DOM lub `display: none`)

### AC-3: home widzi minimalny sidebar (1 pozycja)
GIVEN: Użytkownik zalogowany z rolą `home` (np. Zuza lub Iza)
WHEN: Strona się ładuje
THEN: Sidebar wyświetla tylko 1 pozycję: Home
AND: Wszystkie pozostałe pozycje są ukryte

### AC-4: Niezalogowany — Public Mode (brak pozycji pages)
GIVEN: Użytkownik nie jest zalogowany (brak `kb_token` w localStorage lub token wygasły)
WHEN: Strona się ładuje
THEN: Sidebar nie wyświetla żadnych linków do sub-stron (Pipeline, Models, Home, Settings itp.)
AND: Widoczny jest jedynie przycisk "Zaloguj" lub ikona 🔒 w headerze/sidebarze

### AC-5: Sidebar aktualizuje się po zalogowaniu (bez reload)
GIVEN: Użytkownik jest w trybie Public Mode (niezalogowany)
WHEN: Pomyślnie loguje się przez PIN modal (STORY-3.1 emituje `kb:auth:changed`)
THEN: Sidebar aktualizuje się natychmiast (bez przeładowania strony) i pokazuje pozycje odpowiednie dla nowej roli

### AC-6: Sidebar aktualizuje się po wylogowaniu
GIVEN: Użytkownik jest zalogowany i widzi sidebar z pozycjami odpowiednimi dla swojej roli
WHEN: Klika przycisk "Wyloguj" (dostępny w sidebarze lub headerze)
THEN: Token jest usuwany z localStorage
AND: Sidebar natychmiast przełącza się do Public Mode (brak pozycji pages)
AND: Toast "Wylogowano" wyświetla się przez 3 sekundy

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/` (główna strona dashboard LobsterBoard)
Komponent: `<nav id="kb-sidebar">` w `public/index.html`
Plik logiki: `public/js/sidebar.js`

### Konfiguracja pozycji nawigacyjnych

```javascript
// sidebar.js — mapa pozycji per rola
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',  href: '/',                  icon: '🏠', roles: ['admin'] },
  { id: 'pipeline',  label: 'Pipeline',   href: '/pages/pipeline/',   icon: '⚙️', roles: ['admin'] },
  { id: 'models',    label: 'Models',     href: '/pages/models/',     icon: '🤖', roles: ['admin'] },
  { id: 'eval',      label: 'Eval',       href: '/pages/eval/',       icon: '📊', roles: ['admin'] },
  { id: 'nightclaw', label: 'NightClaw',  href: '/pages/nightclaw/',  icon: '🌙', roles: ['admin'] },
  { id: 'patterns',  label: 'Patterns',   href: '/pages/patterns/',   icon: '🧩', roles: ['admin'] },
  { id: 'chat',      label: 'Chat',       href: '/pages/chat/',       icon: '💬', roles: ['admin', 'home_plus'] },
  { id: 'home',      label: 'Home',       href: '/pages/home/',       icon: '🏡', roles: ['admin', 'home_plus', 'home'] },
  { id: 'settings',  label: 'Settings',   href: '/pages/settings/',   icon: '⚙️', roles: ['admin'] },
];

function getNavForRole(role) {
  if (!role) return []; // Public Mode
  return NAV_ITEMS.filter(item => item.roles.includes(role));
}
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `<nav id="kb-sidebar">` | Nav container | — | public/logged-in |
| `<a class="nav-item">` | Nav link | `href`, `data-id` | active/inactive, hidden |
| Przycisk Wyloguj | Button | — | visible gdy zalogowany |
| Avatar/nazwa użytkownika | Div | role, name | visible gdy zalogowany |

### Stany widoku

**Public Mode (niezalogowany):**
Sidebar pokazuje tylko logo/branding KiraBoard i przycisk "Zaloguj" (ikona 🔒). Żadne linki nawigacyjne nie są widoczne.

**Zalogowany:**
Sidebar pokazuje filtrowaną listę pozycji nav + avatar użytkownika + imię + przycisk "Wyloguj" na dole.

### Flow interakcji

```
1. Strona się ładuje → sidebar.js wywołuje initSidebar()
2. initSidebar() odczytuje kb_token z localStorage
3. Jeśli brak tokenu lub token wygasły → renderSidebar(null) → Public Mode
4. Jeśli token OK → dekoduje payload (base64 decode środkowej części JWT)
5. Pobiera role z payload → renderSidebar(role)
6. renderSidebar(role) filtruje NAV_ITEMS po roles → wstawia <a> do DOM
7. Zdarzenie kb:auth:changed → wywołuje ponownie initSidebar() bez reload
```

### Dekodowanie JWT (bez biblioteki)

```javascript
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}
```

### Responsive / Dostępność
- Mobile (375px+): sidebar jest ukrywany jako hamburger menu; pozycje nav jako lista pionowa w drawer
- Desktop (1280px+): sidebar stały, po lewej stronie
- Keyboard navigation: Tab przechodzi przez linki w kolejności, Enter aktywuje link, Escape zamyka sidebar (mobile)
- ARIA: `<nav aria-label="Nawigacja główna">`, aktywny link ma `aria-current="page"`

---

## ⚠️ Edge Cases

### EC-1: Uszkodzony token w localStorage (niepoprawny base64)
Scenariusz: Token w localStorage jest obcięty lub zniekształcony (np. błąd podczas zapisu)
Oczekiwane zachowanie: `decodeJwtPayload` zwraca null → system traktuje jako brak tokenu → Public Mode; token jest usuwany z localStorage
Komunikat dla użytkownika: (brak — cichy fallback do Public Mode)

### EC-2: Token z nieznaną rolą
Scenariusz: JWT payload zawiera `role: "superadmin"` lub inną rolę spoza whitelist
Oczekiwane zachowanie: `getNavForRole("superadmin")` zwraca pustą tablicę → sidebar pokazuje Public Mode; użytkownik może się ponownie zalogować
Komunikat dla użytkownika: (brak — sidebar wygląda jak Public Mode)

### EC-3: localStorage niedostępny (prywatny tryb browsera z blokowaniem)
Scenariusz: Przeglądarka blokuje dostęp do localStorage (np. Safari Private Browsing z niektórymi ustawieniami)
Oczekiwane zachowanie: try/catch wokół `localStorage.getItem` → graceful fallback do Public Mode; aplikacja nie crashuje
Komunikat dla użytkownika: (brak — Public Mode działa bez localStorage)

---

## 🚫 Out of Scope tej Story
- Animacje wejścia/wyjścia pozycji sidebarowych — future enhancement
- Drag & drop reorder pozycji sidebarowych — EPIC-10
- Personalizacja widocznych pozycji przez użytkownika — future
- Server-side rendering sidebarowych pozycji — LobsterBoard jest client-side
- Greyed-out (disabled) pozycje zamiast ukrytych — decyzja PRD: ukryj, nie szarz

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Admin widzi 9 pozycji sidebarowych
- [ ] home_plus widzi 2 pozycje (Home, Chat)
- [ ] home widzi 1 pozycję (Home)
- [ ] Niezalogowany widzi Public Mode (brak pozycji pages)
- [ ] Sidebar aktualizuje się bez reload po zalogowaniu/wylogowaniu
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku
- [ ] Każda rola przetestowana manualnie
- [ ] UI nie pokazuje pozycji do których user nie ma dostępu
- [ ] Story review przez PO
