---
story_id: STORY-3.1
title: "PIN modal — 4-cyfrowy kod, role lookup, JWT mint"
epic: EPIC-3
module: auth
domain: auth
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-3.5]
blocks: [STORY-3.3]
tags: [pin, jwt, login, auth, modal]
---

## 🎯 User Story

**Jako** Mariusz lub Angelika (użytkownik KiraBoard)
**Chcę** wpisać swój 4-cyfrowy PIN w modalnym oknie na ekranie głównym
**Żeby** system zidentyfikował mnie, wygenerował JWT z moją rolą i przeniósł mnie do właściwej sekcji dashboardu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Triggerowane przez: kliknięcie ikony 🔒 w headerze LobsterBoard lub skrót `Ctrl+L`
- Endpoint: `POST /api/auth/login` (zdefiniowany w `server.cjs`)
- Plik frontend: `public/js/auth-modal.js` (nowy) + integracja z `public/index.html`
- Plik backend: `server.cjs` — rozszerzenie istniejącego PIN auth
- Token storage: `localStorage.setItem('kb_token', token)`

### Powiązane pliki
- `server.cjs` — główny serwer Express, tu ląduje `POST /api/auth/login`
- `public/index.html` — dodać overlay i button trigger
- `public/js/auth-modal.js` — nowy plik: logika PIN modala
- `users.json` — źródło prawdy (przygotowane przez STORY-3.5)

### Stan systemu przed tą story
- STORY-3.5 gotowa: tabela `kb_users` w SQLite istnieje, użytkownicy zaseedowani z PIN hashami (SHA-256)
- LobsterBoard działa (server.cjs startuje, index.html serwowany)
- `better-sqlite3` i `jsonwebtoken` zainstalowane w package.json

---

## ✅ Acceptance Criteria

### AC-1: Otwarcie PIN modala
GIVEN: Użytkownik jest niezalogowany (brak `kb_token` w localStorage lub token wygasły)
WHEN: Klika ikonę 🔒 w headerze LobsterBoard (lub używa `Ctrl+L`)
THEN: Na ekranie pojawia się overlay z PIN modalem zawierającym: tytuł "Wpisz PIN", numeryczna klawiatura 0-9, przycisk ⌫ (backspace), 4 kółka/kropki pokazujące wpisane cyfry (masked), przycisk "Anuluj"
AND: Fokus jest automatycznie ustawiony na modal (dostępność klawiatury)

### AC-2: Poprawny PIN — sukces logowania
GIVEN: Modal PIN jest otwarty, użytkownik ma konto w systemie (np. Mariusz z PIN 1234)
WHEN: Użytkownik wpisuje poprawny 4-cyfrowy PIN (naciska 4 cyfry na klawiaturze modalnej)
THEN: System wysyła `POST /api/auth/login` z `{ pin: "1234" }`
AND: Serwer wyszukuje użytkownika po SHA-256 hashu PINu w tabeli `kb_users`
AND: Serwer zwraca `{ token: "<JWT>", user: { name, role, avatar } }` (status 200)
AND: Token jest zapisywany w `localStorage` pod kluczem `kb_token`
AND: Modal zamyka się, strona wyświetla toast "Zalogowano jako Mariusz 🦊"

### AC-3: Redirect po zalogowaniu per rola
GIVEN: Użytkownik właśnie się zalogował
WHEN: Token jest zapisany w localStorage
THEN: Jeśli rola `admin` → pozostaje na głównym dashboardzie (bez redirect, odświeża sidebar)
AND: Jeśli rola `home_plus` lub `home` → redirect na `/pages/home/`

### AC-4: Błędny PIN — komunikat błędu
GIVEN: Modal PIN jest otwarty
WHEN: Użytkownik wpisuje niepoprawny PIN (nie pasuje do żadnego użytkownika)
THEN: Serwer zwraca 401 `{ error: "Invalid PIN" }`
AND: Modal wyświetla komunikat "Zły PIN, spróbuj ponownie" pod klawiaturą
AND: Kółka/kropki resetują się do pustych (cyfry usunięte)
AND: Klawiatura pozostaje aktywna (użytkownik może spróbować ponownie)
AND: Komunikat błędu nie ujawnia czy użytkownik istnieje w systemie

### AC-5: JWT payload i expiry
GIVEN: Login zakończony sukcesem
WHEN: JWT jest zdekodowany (client-side, bez biblioteki — atob na środkowy segment)
THEN: Payload zawiera pola: `{ userId, role, name, iat, exp }`
AND: Token ma expiry 7 dni (`expiresIn: '7d'`)
AND: Algorytm podpisu to HS256

### AC-6: Zamknięcie modala bez logowania
GIVEN: Modal PIN jest otwarty
WHEN: Użytkownik klika "Anuluj" lub naciska klawisz `Escape`
THEN: Modal zamyka się bez żadnych efektów ubocznych
AND: Żaden request do `/api/auth/login` nie jest wysyłany

---

## 🔐 Szczegóły Auth

### Role w systemie
- `admin` (Mariusz): dostęp do wszystkich stron, edit mode, pipeline
- `home_plus` (Angelika): dostęp do Home i Chat, redirect na /pages/home/
- `home` (Zuza, Iza): dostęp tylko do Home, redirect na /pages/home/

### Macierz uprawnień

| Funkcjonalność       | admin | home_plus | home |
|----------------------|-------|-----------|------|
| Logowanie przez PIN  | ✅    | ✅        | ✅   |
| Redirect na /home/   | ❌    | ✅        | ✅   |
| Pozostaje na dashboard | ✅  | ❌        | ❌   |
| JWT expiry 7 dni     | ✅    | ✅        | ✅   |

### Implementacja — server.cjs

```javascript
// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const hash = crypto.createHash('sha256').update(pin).digest('hex');
  const user = db.prepare('SELECT * FROM kb_users WHERE pin_hash = ?').get(hash);
  if (!user) return res.status(401).json({ error: 'Invalid PIN' });

  const token = jwt.sign(
    { userId: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
  res.json({ token, user: { name: user.name, role: user.role, avatar: user.avatar } });
});
```

### Implementacja — auth-modal.js (client-side)

```javascript
// Zapis tokenu i redirect
function onLoginSuccess({ token, user }) {
  localStorage.setItem('kb_token', token);
  localStorage.setItem('kb_user', JSON.stringify(user));
  closeModal();
  showToast(`Zalogowano jako ${user.name} ${user.avatar}`);
  if (user.role !== 'admin') {
    window.location.href = '/pages/home/';
  } else {
    updateSidebar(user.role); // odśwież sidebar bez reload
  }
}
```

---

## ⚠️ Edge Cases

### EC-1: PIN poniżej 4 cyfr — submit zbyt wczesny
Scenariusz: Użytkownik wpisał tylko 1-3 cyfry i próbuje potwierdzić (np. klika "OK" lub Enter)
Oczekiwane zachowanie: System nie wysyła requestu — klawiatura jest zablokowana do wpisania 4 cyfr; przycisk submit jest niewidoczny lub disabled dopóki nie ma 4 cyfr
Komunikat dla użytkownika: (brak komunikatu — submit jest niedostępny)

### EC-2: Sieć nieosiągalna — timeout requesta
Scenariusz: Użytkownik wpisał PIN, ale serwer jest nieosiągalny (fetch zwraca NetworkError)
Oczekiwane zachowanie: Modal wyświetla komunikat "Błąd połączenia, spróbuj ponownie"; klawiatura pozostaje aktywna; żaden token nie jest zapisywany
Komunikat dla użytkownika: "Błąd połączenia, spróbuj ponownie"

### EC-3: Wygasły token w localStorage — ponowne logowanie
Scenariusz: Użytkownik miał token z poprzedniej sesji (>7 dni temu), otwiera KiraBoard
Oczekiwane zachowanie: Przy starcie strony (lub przy próbie dostępu do chronionej sekcji) system wykrywa exp < now → usuwa token z localStorage → pokazuje Public Mode; ikona 🔒 jest dostępna do ponownego zalogowania

### EC-4: Jednoczesne wpisanie niepoprawnych PINów > 5 razy
Scenariusz: Ktoś próbuje odgadnąć PIN metodą brute-force
Oczekiwane zachowanie (MVP): Brak rate limitingu na poziomie backendu (wystarczy UX — każda próba resetuje klawiaturę); rate limiting jest out of scope tej story (do EPIC-10)

---

## 🚫 Out of Scope tej Story
- Zarządzanie userami (dodawanie, edycja PIN) — to EPIC-10 Settings
- Rate limiting brute-force — EPIC-10
- Biometrics (Face ID / Touch ID) — future
- JWT refresh endpoint — not needed (7-day expiry)
- Obsługa wielu sesji / multi-tab — out of scope

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `POST /api/auth/login` z poprawnym PIN zwraca 200 + JWT
- [ ] `POST /api/auth/login` z błędnym PIN zwraca 401
- [ ] `POST /api/auth/login` z nieprawidłowym input (np. litery) zwraca 400
- [ ] Token w localStorage po poprawnym logowaniu
- [ ] Redirect na `/pages/home/` dla ról `home_plus` i `home`
- [ ] Admin pozostaje na dashboardzie, sidebar odświeża się
- [ ] Modal zamyka się po `Escape` lub kliknięciu "Anuluj"
- [ ] Każda rola z macierzy przetestowana manualnie
- [ ] Bezpośrednie wywołanie API bez tokenu zwraca 401
- [ ] Story review przez PO
