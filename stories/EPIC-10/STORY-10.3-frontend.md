---
story_id: STORY-10.3
title: "Settings page — theme toggle, language, notifications prefs"
epic: EPIC-10
module: settings
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 4h
depends_on: [STORY-10.2]
blocks: []
tags: [frontend, settings, theme, ui, shadcn]
---

## 🎯 User Story

**Jako** zalogowany użytkownik KiraBoard
**Chcę** mieć stronę Settings z zakładką Preferencje
**Żeby** móc zmienić motyw (light/dark/system), język (pl/en), powiadomienia toast i interwał auto-refresh bez edytowania kodu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/settings` (lub `/pages/settings/index.tsx`)
Komponent główny: `SettingsPage`
Zakładka preferencji: `PreferencesTab`

Strona jest dostępna dla KAŻDEGO zalogowanego użytkownika (nie tylko admin) — każdy może zarządzać własnymi preferencjami.

### Powiązane pliki
- `pages/settings/index.tsx` — strona Settings
- `components/settings/PreferencesTab.tsx` — zakładka preferencji
- `_shared/lib/settings-api.ts` — klient API (GET/POST /api/settings)
- `_shared/hooks/useSettings.ts` — hook do odczytu/zapisu ustawień
- `_shared/context/ThemeContext.tsx` — kontekst motywu (jeśli istnieje)

### Stan systemu przed tą story
- STORY-10.2: `GET /api/settings` i `POST /api/settings` działają
- Auth guard działa — strona jest chroniona przez middleware (STORY-3.3)
- shadcn/ui zainstalowane: `Switch`, `Select`, `Tabs`, `Card`, `Button`, `Label`

---

## ✅ Acceptance Criteria

### AC-1: Strona ładuje i wyświetla aktualne ustawienia użytkownika
GIVEN: zalogowany użytkownik Mariusz ma `theme='dark'`, `language='pl'`, `notifications=true`, `auto_refresh_interval=30`
WHEN: wchodzi na `/settings`
THEN: widzi zakładkę "Preferencje" z: toggle motywu ustawionym na "Ciemny", wybranym językiem "Polski", włączonym switchem powiadomień, dropdownem auto-refresh ustawionym na "30 sekund"

### AC-2: Zmiana motywu jest natychmiast aplikowana i zapisywana
GIVEN: użytkownik jest na `/settings`, aktualny motyw to `dark`
WHEN: kliknie opcję "Jasny" w toggleu motywu
THEN: motyw aplikacji natychmiast się zmienia (klasa `light` na `<html>`)
AND: `POST /api/settings` jest wywołany z `{ "theme": "light" }`
AND: toast "Ustawienia zapisane" pojawia się na 3 sekundy

### AC-3: Zmiana języka jest zapisywana
GIVEN: użytkownik jest na `/settings`, aktualny język to `pl`
WHEN: wybierze "English" z selecta języka i kliknie "Zapisz"
THEN: `POST /api/settings` jest wywołany z `{ "language": "en" }`
AND: toast "Ustawienia zapisane" pojawia się na 3 sekundy

### AC-4: Toggle powiadomień wyłącza toasty
GIVEN: użytkownik ma `notifications=true`
WHEN: kliknie switch "Powiadomienia toast" → wyłączy go
THEN: `POST /api/settings` jest wywołany z `{ "notifications": false }`
AND: kolejne toasty systemowe nie są wyświetlane (kontekst powiadomień respektuje ustawienie)

### AC-5: Błąd API jest obsługiwany
GIVEN: serwer zwraca 500 podczas POST /api/settings
WHEN: użytkownik kliknie "Zapisz"
THEN: toast "Błąd zapisu ustawień. Spróbuj ponownie." pojawia się w kolorze czerwonym
AND: formularz wraca do poprzednich wartości

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/settings`
Komponent: `SettingsPage` → `PreferencesTab`
Plik: `pages/settings/index.tsx`, `components/settings/PreferencesTab.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `SettingsPage` | Page | - | loading, error, filled |
| `PreferencesTab` | Tab content | `settings`, `onSave` | saving, idle |
| `ThemeToggle` | SegmentedControl (3 opcje) | `value`, `onChange` | light/dark/system |
| `LanguageSelect` | Select (shadcn) | `value`, `onChange` | pl/en |
| `NotificationsSwitch` | Switch (shadcn) | `checked`, `onChange` | on/off |
| `AutoRefreshSelect` | Select (shadcn) | `value`, `onChange` | 10/30/60/300 |

### Pola / kontrolki formularza

| Pole | Typ kontrolki | Opcje | Wymagane |
|------|---------------|-------|----------|
| theme | SegmentedControl / 3 Buttony | Jasny / Ciemny / Systemowy | tak |
| language | Select | Polski (pl) / English (en) | tak |
| notifications | Switch | on/off | tak |
| auto_refresh_interval | Select | 10s / 30s / 1 min / 5 min | tak |

### Stany widoku

**Loading:**
Skeleton 4 wierszy (każdy ~40px wysokości) widoczny podczas `GET /api/settings`. Przycisk "Zapisz" disabled.

**Error (błąd ładowania):**
Komunikat "Nie udało się załadować ustawień." + przycisk "Spróbuj ponownie" który wywołuje ponownie GET.

**Filled (normalny stan):**
4 sekcje z kontrolkami: Motyw | Język | Powiadomienia | Auto-refresh. Przycisk "Zapisz" aktywny.

**Saving:**
Przycisk "Zapisz" pokazuje spinner + "Zapisywanie…", kontrolki disabled. Trwa max 2 sekundy.

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na /settings → system pokazuje skeleton (loading)
2. GET /api/settings OK → system wyświetla formularz z aktualnymi wartościami
3. Użytkownik zmienia motyw → zmiana aplikowana lokalnie natychmiast (optimistic update)
4. Użytkownik zmienia inne pola (język, powiadomienia, auto-refresh)
5. Użytkownik klika "Zapisz" → przycisk → spinner, kontrolki disabled
6. POST /api/settings OK → toast "Ustawienia zapisane" (zielony, 3s), formularz odblokowany
7. POST /api/settings błąd → toast "Błąd zapisu ustawień. Spróbuj ponownie." (czerwony), formularz wraca do poprzednich wartości, odblokowany
```

### Zmiana motywu — implementacja
- Motyw aplikowany przez dodanie klasy `light` / `dark` / `system` na element `<html>`
- Przy `system`: respektuje `prefers-color-scheme` media query
- Zmiana następuje **natychmiast** (optimistic) — bez czekania na POST
- Jeśli POST się nie powiedzie → cofnięcie zmiany motywu

### Responsive / Dostępność
- Mobile (375px+): kontrolki full-width, przyciski motywu w kolumnie 3x
- Desktop (1280px+): kontrolki max-width 480px, labelki obok
- Keyboard navigation: Tab między kontrolkami → Enter/Space aktywuje switch/button
- ARIA: `aria-label="Wybór motywu"` na grupie przycisków motywu, `aria-label="Powiadomienia toast"` na switch

---

## ⚠️ Edge Cases

### EC-1: Utrata połączenia podczas zapisu
Scenariusz: użytkownik kliknie "Zapisz" a internet pada przed odpowiedzią
Oczekiwane zachowanie: po timeout (5s) toast "Błąd zapisu ustawień. Spróbuj ponownie." — formularz wraca do poprzednich wartości

### EC-2: Strona otwarta w dwóch zakładkach jednocześnie
Scenariusz: user zmienia motyw w zakładce A i w zakładce B
Oczekiwane zachowanie: każda zakładka działa niezależnie — nie ma sync w real-time (to future feature); ostatni zapis wygrywa (upsert w bazie)

### EC-3: Brak odpowiedzi z GET /api/settings (np. serwer down)
Scenariusz: GET /api/settings zwraca sieciowy błąd (network error)
Oczekiwane zachowanie: komunikat "Nie udało się załadować ustawień." + przycisk "Spróbuj ponownie" (nie pusta strona, nie crash)

---

## 🚫 Out of Scope tej Story
- Dashboard Preset Editor (STORY-10.6) — to osobna zakładka
- Zarządzanie użytkownikami (Users Tab) — to oddzielna story z EPIC-10
- System Tab (Bridge status, API keys) — to oddzielna story z EPIC-10

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading skeleton, error, saving, filled)
- [ ] Zmiana motywu aplikowana natychmiast (optimistic update)
- [ ] Cofnięcie motywu gdy POST się nie powiedzie
- [ ] Toast sukcesu i błędu działają
- [ ] Formularz działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów po polsku
- [ ] Story review przez PO
