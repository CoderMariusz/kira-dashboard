---
story_id: STORY-3.4
title: "Redirect logic — nieautoryzowane → /login, role mismatch → /forbidden"
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
tags: [redirect, auth-guard, useAuth, hook, react, frontend]
---

## 🎯 User Story

**Jako** użytkownik KiraBoard próbujący wejść na chronioną stronę
**Chcę** być automatycznie przekierowany do strony logowania (jeśli niezalogowany) lub strony błędu (jeśli zła rola)
**Żeby** nie widzieć białego ekranu ani błędu JS — tylko czytelny komunikat z możliwością działania

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Hook: `pages/_shared/hooks/useAuth.js` — sprawdza JWT z localStorage, dekoduje rolę, wykrywa expiry
- Komponent: `pages/_shared/components/AuthGuard.jsx` — owija chronione strony, obsługuje redirect
- Użycie: każda React page w `/pages/*/` opakowuje swój root w `<AuthGuard roles={['admin']}>`
- Strony docelowe: `/` (dashboard, Public Mode) i `/pages/forbidden/` (prosty HTML)

### Powiązane pliki
- `pages/_shared/hooks/useAuth.js` — nowy plik (hook)
- `pages/_shared/components/AuthGuard.jsx` — nowy plik (komponent)
- `pages/pipeline/index.html` + `pages/pipeline/app.jsx` — przykład użycia AuthGuard
- `pages/home/index.html` + `pages/home/app.jsx` — przykład użycia AuthGuard (roles: admin, home_plus, home)

### Stan systemu przed tą story
- STORY-3.3 gotowa: serwer zwraca 403 dla chronionych stron, redirect server-side dla stron HTML
- STORY-3.1 gotowa: JWT jest mintowany i zapisywany w localStorage po poprawnym logowaniu
- React pages w `/pages/*/` istnieją (lub będą tworzone przez kolejne epiki)

---

## ✅ Acceptance Criteria

### AC-1: Niezalogowany użytkownik wchodzi na chronioną stronę → redirect na /
GIVEN: Użytkownik nie ma `kb_token` w localStorage (lub token wygasł)
WHEN: Otwiera bezpośrednio URL `/pages/pipeline/` w przeglądarce
THEN: Strona jest owinięta przez `<AuthGuard>` → hook `useAuth` wykrywa brak/wygasły token
AND: Użytkownik jest automatycznie redirectowany na `/` (dashboard, Public Mode)
AND: Na dashboardzie wyświetla się toast lub banner: "Zaloguj się, aby uzyskać dostęp"

### AC-2: Zalogowany z błędną rolą → redirect na /forbidden
GIVEN: Użytkownik zalogowany z rolą `home_plus` (np. Angelika)
WHEN: Otwiera bezpośrednio URL `/pages/pipeline/` (która wymaga roli `admin`)
THEN: `<AuthGuard roles={['admin']}>` sprawdza role z JWT → `home_plus` nie na liście
AND: Użytkownik jest redirectowany na `/pages/forbidden/`
AND: Strona `/pages/forbidden/` wyświetla komunikat "Brak dostępu" z przyciskiem "Wróć na stronę główną"

### AC-3: Zalogowany z poprawną rolą — strona renderuje się
GIVEN: Użytkownik zalogowany z rolą `admin`
WHEN: Otwiera `/pages/pipeline/` (która wymaga roli `admin`)
THEN: `<AuthGuard roles={['admin']}>` przepuszcza użytkownika → children renderują się normalnie
AND: Żaden redirect nie następuje

### AC-4: Hook useAuth zwraca stan autoryzacji
GIVEN: Komponent używający `const { user, isAuthenticated, role } = useAuth()`
WHEN: Token jest poprawny i nieważny w localStorage
THEN: `isAuthenticated === true`, `role === 'admin'` (lub odpowiednia rola), `user === { name, role, userId }`
AND: Gdy brak tokenu lub token wygasły: `isAuthenticated === false`, `role === null`, `user === null`

### AC-5: Wykrycie wygasłej sesji — auto-logout
GIVEN: Użytkownik był zalogowany, ale token wygasł (exp < Date.now()/1000)
WHEN: Użytkownik ładuje jakąkolwiek stronę z `useAuth`
THEN: Hook wykrywa `exp < now` → usuwa token z localStorage → ustawia `isAuthenticated = false`
AND: Toast wyświetla się: "Sesja wygasła, zaloguj się ponownie"
AND: Użytkownik jest redirectowany na `/`

### AC-6: Strona /pages/forbidden/ wyświetla czytelny komunikat
GIVEN: Użytkownik trafił na `/pages/forbidden/` (redirect z AuthGuard)
WHEN: Strona się ładuje
THEN: Wyświetla się komunikat: "🚫 Brak dostępu" + "Nie masz uprawnień do tej sekcji."
AND: Dostępny jest przycisk "Wróć na stronę główną" linkujący do `/`
AND: Dostępny jest przycisk "Zaloguj się" otwierający PIN modal (lub linkujący do `/`)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: Wszystkie `/pages/*/` (hook)
Komponent: `pages/_shared/hooks/useAuth.js`, `pages/_shared/components/AuthGuard.jsx`
Strona błędu: `pages/forbidden/index.html`

### Implementacja — useAuth hook

```javascript
// pages/_shared/hooks/useAuth.js
export function useAuth() {
  const [authState, setAuthState] = React.useState(() => {
    const token = localStorage.getItem('kb_token');
    if (!token) return { isAuthenticated: false, user: null, role: null };

    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (payload.exp * 1000 < Date.now()) {
        // Token wygasły — cleanup
        localStorage.removeItem('kb_token');
        localStorage.removeItem('kb_user');
        return { isAuthenticated: false, user: null, role: null, expired: true };
      }
      return { isAuthenticated: true, user: payload, role: payload.role };
    } catch {
      return { isAuthenticated: false, user: null, role: null };
    }
  });

  return authState;
}
```

### Implementacja — AuthGuard komponent

```jsx
// pages/_shared/components/AuthGuard.jsx
export function AuthGuard({ roles, children }) {
  const { isAuthenticated, role, expired } = useAuth();

  React.useEffect(() => {
    if (expired) showToast("Sesja wygasła, zaloguj się ponownie");
  }, [expired]);

  if (!isAuthenticated) {
    window.location.href = '/';
    return null;
  }

  if (!roles.includes(role)) {
    window.location.href = '/pages/forbidden/';
    return null;
  }

  return children;
}
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `useAuth` | Hook | — | authenticated/unauthenticated/expired |
| `AuthGuard` | Wrapper komponent | `roles: string[]` | redirecting/rendering |
| Strona /forbidden/ | Static HTML | — | wyświetla komunikat + CTA |

### Stany widoku

**Sprawdzanie auth (loading):**
Krótkie migotanie (< 100ms) zanim redirect nastąpi; nie potrzeba dedykowanego loadera — redirect jest natychmiastowy.

**Brak uprawnień:**
Strona `/pages/forbidden/index.html` — statyczny HTML, brak loadera. Treść: "🚫 Brak dostępu", "Nie masz uprawnień do tej sekcji.", [Wróć na stronę główną], [Zaloguj się].

**Uprawniony — normalny render:**
`children` renderują się bez opóźnienia.

### Flow interakcji

```
1. Użytkownik otwiera /pages/pipeline/
2. React mountuje <AuthGuard roles={['admin']}>
3. AuthGuard wywołuje useAuth()
4. useAuth odczytuje kb_token z localStorage
5a. Brak tokenu → redirect na "/" + toast "Zaloguj się..."
5b. Token wygasły → cleanup localStorage → redirect na "/" + toast "Sesja wygasła..."
5c. Token OK, rola nie admin → redirect na "/pages/forbidden/"
5d. Token OK, rola admin → render children (Pipeline app)
```

### Responsive / Dostępność
- Mobile (375px+): strona forbidden działa w pełnej szerokości, przyciski CTA pełna szerokość
- Desktop (1280px+): strona forbidden wyśrodkowana (max-width 400px, centered)
- Keyboard navigation: przyciski na stronie forbidden dostępne przez Tab + Enter
- ARIA: strona forbidden ma `<main>` z `role="alert"` lub `aria-live="polite"` dla komunikatu

---

## ⚠️ Edge Cases

### EC-1: Flash of unauthorized content (FOUC)
Scenariusz: Strona React mountuje się na chwilę zanim AuthGuard sprawdzi token i wykona redirect
Oczekiwane zachowanie: AuthGuard zwraca `null` (lub loading spinner) ZANIM sprawdzi auth — nie renderuje children wcześniej; useAuth jest synchroniczny (czyta z localStorage synchronicznie), więc flash nie powinien wystąpić w normalnych warunkach
Komunikat dla użytkownika: (brak — redirect natychmiastowy)

### EC-2: Użytkownik modyfikuje token w DevTools (zły podpis)
Scenariusz: Użytkownik edytuje `kb_token` w localStorage, zmieniając payload ale nie aktualizując podpisu
Oczekiwane zachowanie (client-side): Jeśli `atob` nie rzuca błędu, hook odczytuje payload z zepsutym podpisem → redirect może nie nastąpić client-side; serwer JEDNAK odrzuca token (jwt.verify w middleware) → zwraca 401/403 → aplikacja obsługuje 401 i wylogowuje użytkownika

### EC-3: Wiele szybkich redirectów (race condition)
Scenariusz: Kilka komponentów AuthGuard na tej samej stronie wykrywa brak auth i wykonuje `window.location.href = '/'` równolegle
Oczekiwane zachowanie: Tylko jeden redirect jest potrzebny — AuthGuard powinien być stosowany tylko na root komponencie page, nie na wielu zagnieżdżonych komponentach

---

## 🚫 Out of Scope tej Story
- Hook `useAuth` nie weryfikuje podpisu JWT — to robi server; klient tylko dekoduje payload
- Historia URL przy redirect (np. powrót na pierwotną stronę po zalogowaniu) — future enhancement
- Animated transitions przy redirect — future enhancement
- Server-side rendering lub middleware SSR — LobsterBoard jest SPA

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Niezalogowany użytkownik na chronionych stronach jest redirectowany na `/`
- [ ] Użytkownik z błędną rolą jest redirectowany na `/pages/forbidden/`
- [ ] Użytkownik z poprawną rolą widzi stronę bez redirect
- [ ] Wygasły token jest usuwany z localStorage
- [ ] Toast "Sesja wygasła" pojawia się przy wygasłym tokenie
- [ ] Strona `/pages/forbidden/` ma czytelny komunikat i przyciski CTA
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty po polsku
- [ ] Story review przez PO
