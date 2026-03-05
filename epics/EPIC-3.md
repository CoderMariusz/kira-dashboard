---
epic_id: EPIC-3
title: "Auth UI — PIN Modal, Role-Based Sidebar, Redirects"
module: auth
status: draft
priority: must
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-3 buduje kliencką warstwę systemu auth zdefiniowanego w EPIC-0 — PIN modal do logowania, role-based nawigację w sidebarze, automatyczne redirecty po zalogowaniu (Mariusz → dashboard, Angelika → /pages/home/), ochronę React pages przed nieautoryzowanym dostępem i widok Public Mode dla niezalogowanych. Foundation serwerowa (users.json, JWT, requireRole) jest gotowa z EPIC-0; ten epic to wyłącznie UI i client-side routing.

## 🎯 CEL BIZNESOWY

Angelika otwiera KiraBoard na telefonie, wpisuje swój PIN, i automatycznie trafia na mobilny Home Dashboard — bez wiedzy o pipeline, modelach czy ustawieniach systemu, które są schowane za rolą `admin`.

## 👤 PERSONA

**Mariusz (Admin)** — loguje się przez PIN, widzi pełny sidebar (Dashboard, Pipeline, Models, Eval, NightClaw, Patterns, Chat, Home, Settings), ma dostęp do edit mode.

**Angelika (home_plus)** — loguje się przez PIN, widzi tylko "Home" i "Chat" w sidebarze, automatycznie redirect na /pages/home/. Nie widzi żadnych opcji developerskich.

**Zuza / Iza (home)** — loguje się przez PIN, widzi tylko "Home" w sidebarze, redirect na /pages/home/.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: `POST /api/auth/login` (JWT), `requireRole()` middleware, `users.json`, `PAGE_ACCESS` map; serwer zwraca role w JWT

### Blokuje (ten epic odblokowuje):
- EPIC-4: Home Dashboard strona musi sprawdzać auth i wymagać role `home` lub `home_plus`
- EPIC-5, 6, 7, 8, 9: Wszystkie React pages muszą weryfikować role przed renderowaniem
- EPIC-10: Settings page wymaga role `admin` — ochrona jest tutaj

## 📦 ZAKRES (In Scope)

- **PIN Modal** — overlay wywoływany przez kliknięcie ikony 🔒 (lub Ctrl+L): numeryczna klawiatura 0-9 z polskim UI "Wpisz PIN", animacja oczekiwania, błąd "Zły PIN, spróbuj ponownie", sukces → JWT zapisany w localStorage, modal zamknięty, redirect
- **Role-based sidebar** — dynamiczna lista linków w sidebarze LobsterBoard na podstawie roli z JWT; rola `admin` → 9 pozycji; rola `home_plus` → 2 pozycje; rola `home` → 1 pozycja; pozycje niedostępne są ukryte (nie tylko greyed out)
- **Automatic redirect after login** — po zalogowaniu: `admin` → pozostaje na dashboard (bez redirect); `home_plus` → redirect do `/pages/home/`; `home` → redirect do `/pages/home/`
- **Public Mode (niezalogowany)** — dashboard widoczny bez logowania (read-only widgety systemu), brak sidebar pages, brak edit mode; przycisk "Zaloguj" widoczny w headerze
- **React pages auth guard** — hook `useAuth` w `pages/_shared/` sprawdza JWT w localStorage, dekoduje rolę, jeśli brak tokenu lub rola nie ma dostępu → redirect na `/` (dashboard) lub wyświetla "Brak dostępu"; każda page dodaje `<AuthGuard roles={['admin']}>`
- **Logout** — przycisk w sidebarze/headerze: usuwa JWT z localStorage, reload strony → Public Mode
- **Sesja expiry handling** — gdy JWT wygasł (7 dni), useAuth wykrywa expired token → automatyczne wylogowanie + toast "Sesja wygasła, zaloguj się ponownie"

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Zarządzanie userami (dodawanie, edycja, reset PIN)** — to jest EPIC-10 (Settings page, tab Users)
- **OAuth / email login** — system jest PIN-only zgodnie z decyzją w PRD (Supabase Auth rejected)
- **Mobile biometrics (Face ID / Touch ID)** — future, nie w PRD
- **Multi-factor auth** — poza scope projektu

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Wpisanie PIN Mariusza → JWT zapisany w localStorage, sidebar pokazuje 9 pozycji (Dashboard, Pipeline, Models, Eval, NightClaw, Patterns, Chat, Home, Settings)
- [ ] Wpisanie PIN Angeliki → redirect automatyczny na `/pages/home/`, sidebar pokazuje tylko "Home" i "Chat"
- [ ] Niezalogowany user widzi dashboard z widgetami (Public Mode) i przycisk "Zaloguj" — żadna page (Pipeline, Settings, etc.) nie jest dostępna
- [ ] Bezpośrednie wejście na `/pages/pipeline/` bez tokenu → redirect na dashboard z komunikatem "Zaloguj się"
- [ ] Po 7 dniach (lub usunięciu tokenu) → auto-logout + toast "Sesja wygasła"
- [ ] Wpisanie złego PIN → komunikat "Zły PIN" + klawiatura reset (bez ujawniania informacji o userach)

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-3.1 | auth | Macierz uprawnień ról — PAGE_ACCESS + route protection | Kompletna macierz page access per rola, weryfikacja JWT w server.cjs dla page routes, zwracanie 403 dla niedozwolonych pages |
| STORY-3.2 | frontend | PIN Modal — UI logowania | Numeryczna klawiatura overlay: wpisanie PIN → POST /api/auth/login → JWT zapis + redirect per rola |
| STORY-3.3 | frontend | Role-based sidebar — dynamiczna nawigacja | Sidebar LobsterBoard filtruje pozycje na podstawie roli z JWT; Public Mode ukrywa wszystkie pages |
| STORY-3.4 | frontend | Auth guard dla React pages — hook useAuth | Hook `useAuth` w `_shared/hooks/`, komponent `<AuthGuard>` z redirect, sesja expiry detection, logout action |
| STORY-3.5 | frontend | Public Mode + redirect flows | Widok niezalogowany (read-only dashboard), auto-redirect po login per rola, logout + cleanup |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | auth |
| Priorytet | Must |
| Szacunek | M (3 dni) |
| Ryzyko | Niskie — foundation serwerowa gotowa z EPIC-0; tu wyłącznie UI |
| Domeny | auth, frontend |
| Stack | Vanilla JS (LobsterBoard core: PIN modal, sidebar), React hooks (pages/_shared: useAuth, AuthGuard), JWT decode (client-side, bez biblioteki — base64 decode) |
| Uwagi | PIN modal bazuje na istniejącym mechanizmie PIN w LobsterBoard — rozszerzyć, nie przepisywać. Sidebar to modyfikacja istniejącego HTML nav — dodać kondycjonalne renderowanie na podstawie localStorage JWT. |
