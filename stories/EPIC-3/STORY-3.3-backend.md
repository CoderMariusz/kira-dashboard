---
story_id: STORY-3.3
title: "Auth middleware — JWT verify + role extraction per route"
epic: EPIC-3
module: auth
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 4h
depends_on: [STORY-3.1]
blocks: [STORY-3.2, STORY-3.4]
tags: [middleware, jwt, authorization, route-protection, backend]
---

## 🎯 User Story

**Jako** developer KiraBoard (Mariusz)
**Chcę** żeby serwer Express weryfikował JWT i rolę użytkownika dla każdej chronionej trasy
**Żeby** żaden nieautoryzowany użytkownik nie mógł ominąć ochrony poprzez bezpośrednie żądania HTTP

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `server.cjs` — middleware i route protection
- Middleware: `requireRole(...roles)` — weryfikuje JWT z nagłówka Authorization
- Mapa dostępu: `PAGE_ACCESS` — obiekt role → lista dozwolonych stron
- Chronione endpointy: wszystkie `/api/*` (z wyjątkiem `POST /api/auth/login`) + serwowane strony w `/pages/*`

### Powiązane pliki
- `server.cjs` — główny plik serwera, tu żyje cały backend
- `.env` — `JWT_SECRET` (sekret do podpisywania/weryfikacji JWT)
- `public/pages/*/index.html` — strony serwowane przez Express dla ról

### Stan systemu przed tą story
- STORY-3.1 gotowa: `POST /api/auth/login` mintuje JWT (HS256, payload: {userId, role, name}, exp: 7d)
- `jsonwebtoken` jest zainstalowany w package.json
- `JWT_SECRET` jest ustawiony w `.env` i wczytywany przez `dotenv`

---

## ✅ Acceptance Criteria

### AC-1: Middleware weryfikuje JWT dla chronionej trasy
GIVEN: Chroniony endpoint np. `GET /api/pipeline/status` z dołączonym middleware `requireRole('admin')`
WHEN: Request nie zawiera nagłówka `Authorization` (lub zawiera nieprawidłową wartość)
THEN: Serwer zwraca `401 Unauthorized` z body `{ error: "Brak autoryzacji" }`
AND: Request nie dociera do handlera endpointu

### AC-2: Middleware odrzuca wygasły token
GIVEN: Chroniony endpoint z middleware `requireRole(...)`
WHEN: Request zawiera `Authorization: Bearer <token>` gdzie token jest wygasły (exp < now)
THEN: Serwer zwraca `401 Unauthorized` z body `{ error: "Sesja wygasła" }`

### AC-3: Middleware odrzuca błędną rolę (403)
GIVEN: Chroniony endpoint z middleware `requireRole('admin')` i użytkownik z rolą `home_plus`
WHEN: Request zawiera poprawny, ważny JWT z rolą `home_plus`
THEN: Serwer zwraca `403 Forbidden` z body `{ error: "Brak uprawnień" }`
AND: Request nie dociera do handlera endpointu

### AC-4: Middleware przepuszcza użytkownika z poprawną rolą
GIVEN: Chroniony endpoint z middleware `requireRole('admin')` i użytkownik z rolą `admin`
WHEN: Request zawiera poprawny, ważny JWT z rolą `admin`
THEN: Middleware wywołuje `next()`, request dociera do handlera
AND: `req.user` zawiera zdekodowany payload `{ userId, role, name }`

### AC-5: Mapa PAGE_ACCESS chroni strony serwowane statycznie
GIVEN: Użytkownik z rolą `home_plus` próbuje wejść bezpośrednio na `/pages/pipeline/`
WHEN: GET `/pages/pipeline/` z tokenem home_plus w ciasteczku lub nagłówku (lub bez tokenu)
THEN: Serwer sprawdza PAGE_ACCESS['home_plus'] → 'pipeline' nie jest na liście → zwraca redirect `302` na `/` z query `?error=forbidden`
AND: Lub serwer zwraca `403` z HTML błędu (decyzja implementacyjna: redirect jest preferowany dla stron)

### AC-6: Endpoint publiczny (login) nie wymaga tokenu
GIVEN: Serwer uruchomiony, użytkownik niezalogowany
WHEN: POST `/api/auth/login` z body `{ pin: "1234" }` — BEZ nagłówka Authorization
THEN: Serwer przetwarza żądanie normalnie (weryfikuje PIN, zwraca token lub 401)
AND: Middleware `requireRole` NIE jest aplikowany do tego endpointu

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

Middleware `requireRole` jest stosowany do istniejących i przyszłych endpointów, nie jest osobnym endpointem. Przykłady zastosowania:

```
GET  /api/pipeline/status    → requireRole('admin')
GET  /api/models/list        → requireRole('admin')
GET  /api/eval/results       → requireRole('admin')
GET  /pages/pipeline/        → requireRole('admin') lub redirect
GET  /pages/home/            → requireRole('admin', 'home_plus', 'home') lub redirect
```

### Request Schema

```javascript
// Nagłówek wymagany dla chronionych tras:
// Authorization: Bearer <jwt_token>

// Middleware wydobywa token:
const authHeader = req.headers['authorization'];
const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
```

### Response Schema

```javascript
// 401 — brak tokenu lub token wygasły
{ "error": "Brak autoryzacji" }
{ "error": "Sesja wygasła" }

// 403 — poprawny token, zła rola
{ "error": "Brak uprawnień" }

// Dla stron HTML (pages/*) zamiast JSON → redirect:
// HTTP 302 Location: /?error=forbidden
```

### Logika biznesowa — middleware requireRole

```javascript
const PAGE_ACCESS = {
  admin:     ['dashboard', 'pipeline', 'models', 'eval', 'nightclaw', 'patterns', 'chat', 'home', 'settings'],
  home_plus: ['home', 'chat'],
  home:      ['home']
};

function verifyToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw { status: 401, message: 'Sesja wygasła' };
    return null;
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    let user;
    try {
      user = verifyToken(req);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || 'Brak autoryzacji' });
    }
    if (!user) return res.status(401).json({ error: 'Brak autoryzacji' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Brak uprawnień' });
    req.user = user;
    next();
  };
}
```

### Logika krok po kroku

```
1. Request przychodzi do chronionego endpointu
2. Middleware requireRole wydobywa token z nagłówka Authorization
3. Brak nagłówka → 401 "Brak autoryzacji"
4. Nieprawidłowy format (nie "Bearer X") → 401 "Brak autoryzacji"
5. jwt.verify() rzuca TokenExpiredError → 401 "Sesja wygasła"
6. jwt.verify() rzuca JsonWebTokenError (nieprawidłowy podpis) → 401 "Brak autoryzacji"
7. Token OK → sprawdź user.role vs allowed roles
8. Rola niedozwolona → 403 "Brak uprawnień"
9. Rola dozwolona → req.user = payload, next()
```

---

## ⚠️ Edge Cases

### EC-1: Token z algorytmem innym niż HS256 (algorithm confusion)
Scenariusz: Atakujący wysyła token podpisany algorytmem `none` lub `RS256`
Oczekiwane zachowanie: `jwt.verify()` z opcją `{ algorithms: ['HS256'] }` odrzuca token → 401
Komunikat dla użytkownika: `{ error: "Brak autoryzacji" }`

### EC-2: JWT_SECRET niezdefiniowany w środowisku
Scenariusz: Serwer startuje bez pliku `.env` lub bez zmiennej `JWT_SECRET`
Oczekiwane zachowanie: Serwer loguje błąd do konsoli i nie startuje (early exit) OR `jwt.verify` rzuca błąd → obsługiwany jako 500; nigdy nie autoryzuje request bez sekretu
Komunikat dla użytkownika: `{ error: "Błąd konfiguracji serwera" }` (500)

### EC-3: Nagłówek Authorization z pustym tokenem
Scenariusz: Request zawiera `Authorization: Bearer ` (spacja po Bearer, pusty token)
Oczekiwane zachowanie: `token` po split jest pustym stringiem → `jwt.verify('')` rzuca błąd → 401

### EC-4: Równoległe requesty z tym samym wygasłym tokenem
Scenariusz: Frontend wysyła kilka równoległych requestów API z wygasłym tokenem
Oczekiwane zachowanie: Każdy request niezależnie dostaje 401 → frontend obsługuje wszystkie 401 i pokazuje modal logowania jeden raz (logika deduplikacji w kliencie, out of scope tej story)

---

## 🚫 Out of Scope tej Story
- Endpoint `POST /api/auth/logout` (server-side token invalidation) — JWT jest stateless, logout przez usunięcie z localStorage (STORY-3.4)
- Token refresh endpoint — 7-day expiry jest wystarczający dla MVP
- Rate limiting na endpointach — EPIC-10
- Audit log żądań API per user — EPIC-10
- CORS konfiguracja — odrębna kwestia DevOps
- WebSocket auth — odrębna story jeśli pojawi się WS

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Endpoint zwraca 401 dla braku tokenu
- [ ] Endpoint zwraca 401 dla wygasłego tokenu
- [ ] Endpoint zwraca 403 dla poprawnego tokenu z nieprawidłową rolą
- [ ] Endpoint zwraca 200 dla poprawnego tokenu z właściwą rolą
- [ ] `jwt.verify` używa `{ algorithms: ['HS256'] }` (algorithm confusion protection)
- [ ] Endpoint nie crashuje na pustej bazie
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą zwraca 403
- [ ] Story review przez PO
