---
story_id: STORY-0.4
title: "Users.json + PIN auth + JWT system"
epic: EPIC-0
module: infrastructure
domain: auth
status: ready
difficulty: moderate
recommended_model: kimi-k2.5
priority: must
estimated_effort: 4h
depends_on: [STORY-0.1]
blocks: [STORY-0.9, STORY-0.16]
tags: [auth, jwt, pin, users, security]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** móc zalogować się do KiraBoard PIN-em i otrzymać JWT token z przypisaną rolą
**Żeby** dashboard wiedział kim jestem i jakie mam uprawnienia do stron i API

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Nowy katalog: `auth/`
  - `auth/users-seed.js` — jednorazowy skrypt generujący `users.json`
  - `auth/middleware.js` — funkcje auth: authenticate, verifyToken, requireRole
- Modyfikacja: `server.cjs` — endpoint `POST /api/auth/login` + `GET /api/auth/me`
- Plik danych: `users.json` w root projektu

### Stan systemu przed tą story
- STORY-0.1 ukończona — repo istnieje
- `jsonwebtoken` do zainstalowania

---

## ✅ Acceptance Criteria

### AC-1: Login z poprawnym PIN — admin
GIVEN: `users.json` zawiera Mariusza z zahashowanym PIN (np. 1234)
WHEN: Wykonasz `POST /api/auth/login` z body `{ "pin": "1234" }`
THEN: Response 200 z `{ "token": "<JWT>", "user": { "name": "Mariusz", "role": "admin", "avatar": "🦊" } }`

### AC-2: Login z błędnym PIN
GIVEN: `users.json` załadowany
WHEN: Wykonasz `POST /api/auth/login` z body `{ "pin": "9999" }` (błędny PIN)
THEN: Response 401 z `{ "error": "Invalid PIN" }`

### AC-3: GET /api/auth/me z ważnym tokenem
GIVEN: Uzyskałeś JWT z AC-1
WHEN: Wykonasz `GET /api/auth/me` z headerem `Authorization: Bearer <JWT>`
THEN: Response 200 z `{ "user": { "name": "Mariusz", "role": "admin", "avatar": "🦊" } }`

### AC-4: GET /api/auth/me bez tokena
GIVEN: Brak tokena w headerze
WHEN: Wykonasz `GET /api/auth/me`
THEN: Response 401 z `{ "error": "Not authenticated" }`

### AC-5: requireRole middleware blokuje nieautoryzowane role
GIVEN: Zalogowana Angelika (role: home_plus)
WHEN: Wykona request na route chroniony `requireRole('admin')`
THEN: Response 403 z `{ "error": "Forbidden" }`

---

## 🔧 Szczegóły implementacji

### auth/users-seed.js (jednorazowy skrypt)

```javascript
const crypto = require('crypto');
const fs = require('fs');

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

// Użycie: node auth/users-seed.js <mariusz_pin> <angelika_pin> <zuza_pin> <iza_pin>
const [,, p1, p2, p3, p4] = process.argv;
if (!p1 || !p2 || !p3 || !p4) {
  console.log('Usage: node auth/users-seed.js <mariusz_pin> <angelika_pin> <zuza_pin> <iza_pin>');
  process.exit(1);
}

const users = [
  { name: 'Mariusz', pin_hash: hashPin(p1), role: 'admin', avatar: '🦊' },
  { name: 'Angelika', pin_hash: hashPin(p2), role: 'home_plus', avatar: '🌸' },
  { name: 'Zuza', pin_hash: hashPin(p3), role: 'home', avatar: '⭐' },
  { name: 'Iza', pin_hash: hashPin(p4), role: 'home', avatar: '🌙' },
];

fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
console.log('✅ users.json created with hashed PINs');
```

### auth/middleware.js

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'kiraboard-dev-secret-change-in-prod';
const JWT_EXPIRY = '7d';

let users = [];
try { users = JSON.parse(fs.readFileSync('users.json', 'utf8')); } catch {}

const PAGE_ACCESS = {
  admin:     ['dashboard','pipeline','models','eval','nightclaw','patterns','chat','home','settings'],
  home_plus: ['home','chat'],
  home:      ['home']
};

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function authenticate(pin) {
  const hash = hashPin(pin);
  const user = users.find(u => u.pin_hash === hash);
  if (!user) return null;
  const token = jwt.sign(
    { name: user.name, role: user.role, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  return { token, user: { name: user.name, role: user.role, avatar: user.avatar } };
}

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch { return null; }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  };
}

function canAccessPage(role, page) {
  return (PAGE_ACCESS[role] || []).includes(page);
}

module.exports = { authenticate, verifyToken, requireRole, canAccessPage, PAGE_ACCESS };
```

### Endpointy w server.cjs

```javascript
const { authenticate, verifyToken, requireRole } = require('./auth/middleware');

app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  const result = authenticate(pin);
  if (!result) return res.status(401).json({ error: 'Invalid PIN' });
  res.json(result);
});

app.get('/api/auth/me', (req, res) => {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user });
});
```

---

## ⚠️ Edge Cases

### EC-1: users.json nie istnieje przy starcie
Scenariusz: Nowe środowisko, `users.json` nie wygenerowany
Oczekiwane zachowanie: Middleware ładuje pustą tablicę `[]`, `/api/auth/login` zawsze zwraca 401 z `{ "error": "Invalid PIN" }`, serwer nie crashuje

### EC-2: Wygasły JWT token (po 7 dniach)
Scenariusz: Użytkownik ma stary token (> 7 dni)
Oczekiwane zachowanie: `verifyToken` zwraca null → `/api/auth/me` odpowiada 401 `{ "error": "Not authenticated" }`

### EC-3: JWT_SECRET nie ustawiony w produkcji
Scenariusz: Brak `JWT_SECRET` w `.env` — używany domyślny `kiraboard-dev-secret`
Oczekiwane zachowanie: Serwer loguje WARNING: `⚠️ JWT_SECRET not set — using insecure default!`

---

## 🚫 Out of Scope tej Story
- UI logowania (EPIC-3)
- Zmiana PIN przez użytkownika
- Refresh token mechanism
- OAuth/external providers
- Przechowywanie userów w SQLite (users.json jest wystarczający dla 4 userów)

---

## ✔️ Definition of Done
- [ ] `npm install jsonwebtoken` dodane do `package.json`
- [ ] `auth/users-seed.js` istnieje — uruchamia się, generuje `users.json` z hashami
- [ ] `users.json` zawiera 4 userów z `pin_hash` (nie plaintext PIN)
- [ ] `POST /api/auth/login` z poprawnym PIN → 200 + JWT + user info
- [ ] `POST /api/auth/login` z błędnym PIN → 401
- [ ] `GET /api/auth/me` z ważnym JWT → 200 + user info
- [ ] `GET /api/auth/me` bez JWT → 401
- [ ] `requireRole('admin')` middleware działa — blokuje home_plus (403)
- [ ] `PAGE_ACCESS` map zdefiniowana dla 3 ról
- [ ] JWT wygasa po 7 dniach
- [ ] Brak `users.json` → serwer startuje, login zawsze 401 (nie crash)
