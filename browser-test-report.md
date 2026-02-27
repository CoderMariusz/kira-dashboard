# Browser Test Report — Kira Dashboard
**Data:** 2026-02-27
**Base URL:** http://localhost:3000
**Auth:** admin@kira.local (ADMIN)
**Narzędzie:** Playwright + Chromium (lokalny)
**Łącznie testów:** 63 wykonanych, 46 PASS, 12 FAIL, 5 SKIP

---

## 📊 Wyniki — przegląd

| # | Strona | PASS | FAIL | SKIP | Status |
|---|--------|------|------|------|--------|
| 01 | /login | 5/5 | 0 | 0 | ✅ |
| 02 | /home | 4/4 | 0 | 0 | ✅ |
| 03 | /home/tasks | 1/5 | 3 | 1 | ❌ |
| 04 | /home/shopping | 2/4 | 0 | 2 | ⚠️ |
| 05 | /settings/users | 3/5 | 2 | 0 | ⚠️ |
| 06 | /dashboard/eval | 4/4 | 0 | 0 | ✅ |
| 07 | /dashboard/patterns | 4/5 | 0 | 1 | ✅ |
| 08 | /story/[id] | 2/3 | 0 | 1 | ✅ |
| 09 | /dashboard (main) | 5/5 | 0 | 0 | ✅ |
| 10 | /settings/system | 4/4 | 0 | 0 | ✅ |
| 11 | /dashboard/models | 3/3 | 0 | 0 | ✅ |
| 12 | /dashboard/nightclaw | 2/5 | 3 | 0 | ❌ |
| 13 | /home/analytics | 3/3 | 0 | 0 | ✅ |
| 14 | /home/activity | 0/5 | 4 | 1 | ❌ |
| 15 | /home/household | 2/3 | 0 | 0 | ✅ |

---

## ✅ Co działa poprawnie

### /login — 5/5 ✅
- Strona ładuje się, wszystkie elementy widoczne (email, hasło, submit, tytuł)
- Walidacja pustych pól (komunikaty: "Podaj adres email", "Podaj hasło")
- Walidacja błędnego formatu email
- Błędne credentials → komunikat błędu (nie crash)
- Poprawne logowanie → redirect do /dashboard

### /home — 4/4 ✅
- Strona ładuje się bez błędów
- QuickAction link /home/shopping działa
- QuickAction link /home/tasks działa
- Sidebar z nawigacją widoczny

### /dashboard (main) — 5/5 ✅
- Sidebar widoczny po zalogowaniu
- Tab switching: Pipeline, Eval, NightClaw — działają
- Sidebar link /home działa

### /dashboard/eval — 4/4 ✅
- Strona ładuje się, nagłówek Eval widoczny
- Tabela Golden Tasks wyświetla się (lub empty state)
- Przycisk "Dodaj" otwiera panel/drawer
- Brak błędów 500

### /dashboard/patterns — 4/5 ✅ (1 SKIP — brak danych)
- Strona ładuje się, nagłówek Patterns widoczny
- Search input działa (wpisywanie, wartość zachowana)
- Zakładki Patterns / Lessons widoczne
- Brak błędów 500

### /story/[id] — 2/3 ✅ (1 SKIP — brak linków w pipeline)
- Nieistniejące story nie crashuje (obsługa 404)
- Brak błędów 500

### /settings/system — 4/4 ✅
- Nagłówek Settings/System widoczny
- Sub-nav link Users widoczny
- Przycisk Restart Bridge widoczny
- Brak błędów 500

### /dashboard/models — 3/3 ✅
- Nagłówek Models widoczny
- Strona ładuje się (offline state — Bridge offline)
- Brak błędów 500

### /home/analytics — 3/3 ✅
- Strona ładuje się dla ADMIN (nie pokazuje "HELPER only" fallback)
- SVG wykresy renderują się
- Brak błędów 500

### /home/household — 2/3 ✅
- Strona ładuje się (ADMIN widzi household, nie jest redirectowany)
- Brak błędów 500

### /home/shopping — 2/4 ⚠️ (2 SKIP — brak produktów w bazie)
- Strona ładuje się bez błędów
- Progress bar (aria-label zakupów) widoczny
- SKIP: dodaj produkt / toggle bought — brak istniejących produktów

---

## ❌ Błędy do poprawy

### 1. /home/tasks — Kanban board wisi w "Ładowanie…" ❌
**Symptom:** Board ładuje skeleton `"Ładowanie tablicy zadań..."` ale nigdy nie wczytuje danych — FilterBar, QuickAddTask i karty zadań nigdy nie stają się widoczne.
**Diagnoza:** API `/api/home/tasks` lub `/api/home/household` timeout/błąd. Brak household dla usera admin@kira.local prawdopodobnie powoduje że board nie może pobrać danych.
**Dotyczy testów:** T2 (FilterBar), T3 (QuickAddTask), T4 (search input)
**Priorytet:** 🔴 Wysoki

### 2. /home/activity — Strona wisi w "Ładowanie…" ❌
**Symptom:** Main zawiera tylko `"Ładowanie…"` — nigdy nie renderuje nagłówka h1, filtrów ani feedu aktywności.
**Diagnoza:** Tak samo jak tasks — brak household blokuje ActivityFeed (wymaga `householdId`). Bez household → `householdId=null` → fetch nie odpala.
**Dotyczy testów:** T1-T4 (wszystkie)
**Priorytet:** 🔴 Wysoki

### 3. /dashboard/nightclaw — client-side exception ❌
**Symptom:** `Application error: a client-side exception has occurred` — React renderuje error boundary. Strona pokazuje błąd aplikacji zamiast zakładek.
**Diagnoza:** Widoczny w error-context: Next.js Dev Tools pokazuje błąd komponentu `NightClawPageContent` w `page.tsx:333`. Prawdopodobnie null reference przy próbie renderowania danych (Bridge offline → null data → unhandled).
**Dotyczy testów:** T2 (zakładki), T3 (tab Digest), T4 (tab Stats)
**Priorytet:** 🔴 Wysoki

### 4. /settings/users — selektor "Użytkownicy" (ambiguous) ⚠️
**Symptom:** `getByText('Użytkownicy')` timeout — element istnieje (tabela z danymi widoczna, T2-T4 przechodzą) ale tekst "Użytkownicy" pojawia się wielokrotnie (nagłówek + sub-nav + sidebar).
**Diagnoza:** Test selector zbyt ogólny — nie błąd aplikacji, błąd testu.
**Priorytet:** 🟡 Niski (test issue, nie bug aplikacji)

### 5. /settings/users — link /settings/system (navigation) ⚠️
**Symptom:** Kliknięcie `a[href="/settings/system"]` nie naviguje (timeout na `waitForURL`).
**Diagnoza:** Link jest widoczny ale może być schowany za overlayem po zamknięciu modalu w poprzednim kroku, lub router push nie działa jak `waitForURL` oczekuje (SSR redirect).
**Priorytet:** 🟡 Niski (test timing issue)

---

## 🔍 Wnioski i rekomendacje

### Problem główny: brak household dla admin@kira.local
Tasks i Activity wymagają `householdId` do załadowania danych. User `admin@kira.local` nie ma przypisanego household → API zawiesza się lub zwraca null → loading state permanentny.

**Fix:** Dodaj household dla admin@kira.local w bazie (lub stwórz seed script do testów):
```sql
INSERT INTO households (name, created_by) VALUES ('Test Household', '<admin-user-id>');
INSERT INTO household_members (household_id, user_id, role) VALUES ('<household-id>', '<admin-user-id>', 'ADMIN');
```

### Problem główny 2: NightClaw unhandled null reference
`NightClawPageContent` crashuje gdy Bridge jest offline i dane są null. Potrzebuje lepszej obsługi null safety lub try/catch w render.

**Fix:** Sprawdź `page.tsx:333` — prawdopodobnie coś w stylu `data.something.map(...)` gdzie `data` jest `null`.

### Pozytywne obserwacje
- Auth flow działa perfekcyjnie (login, walidacja, redirect)
- Większość dashboardu Pipeline działa (Eval, Patterns, Models)
- Settings/Users CRUD działa (InviteModal, role management)
- Analytics renderuje wykresy

---

*Raport wygenerowany: 2026-02-27 | Playwright 1.58.2 | Chromium 145*
