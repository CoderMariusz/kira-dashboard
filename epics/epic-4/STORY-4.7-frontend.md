---
story_id: STORY-4.7
title: "Household Management — strona /home/household z listą członków, zaproszeniami i usuwaniem"
epic: EPIC-4
module: home
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: epics/kira-home-dashboard-mockup.html → sidebar "Family > Household"
api_reference: /api/home/household/invite (POST), /api/home/household/members (GET, DELETE)
priority: should
estimated_effort: 6 h
depends_on: STORY-4.1, STORY-4.2, STORY-4.3
blocks: none
tags: [migration, household, invite, members, role-guard, dark-theme]
---

## 🎯 User Story

**Jako** użytkownik z rolą HELPER_PLUS lub ADMIN
**Chcę** mieć stronę `/home/household` z listą członków, formularzem zaproszeń i listą oczekujących zaproszeń
**Żeby** zarządzać składem rodziny w dashboardzie bez wychodzenia do panelu Supabase

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/home/household` (plik: `src/app/(home)/household/page.tsx`)
- Komponenty: `src/components/home/household/HouseholdMembers.tsx`, `src/components/home/household/InviteForm.tsx`, `src/components/home/household/PendingInvites.tsx`
- Źródło migracji: `archive/src/components/household/{HouseholdMembers,InviteForm,PendingInvites}.tsx`

### Powiązane pliki
- `archive/src/components/household/HouseholdMembers.tsx` — komponent do migracji
- `archive/src/components/household/InviteForm.tsx` — komponent do migracji
- `archive/src/components/household/PendingInvites.tsx` — komponent do migracji
- `archive/src/lib/hooks/useHouseholdMembers.ts` — hook (zmigruj do nowego projektu)
- `archive/src/lib/hooks/useInvites.ts` — hook do zmigrowania
- Mockup: `epics/kira-home-dashboard-mockup.html` → sidebar "Family" sekcja, item "👥 Household"
- Mockup mobile: `epics/kira-home-dashboard-mobile-mockup.html` → nie ma dedykowanej zakładki Household, ale obserwuj dark theme colors

### Stan systemu przed tą story
- STORY-4.1 ukończona: tabele `households`, `household_members` istnieją w Supabase z RLS
- STORY-4.2 ukończona: endpoint `POST /api/home/household/invite` istnieje i obsługuje zapro­szenia do household (NIE to jest Supabase Auth invite — to zaproszenie do household za pomocą tokenu z tabeli `household_invites` lub Supabase realtime link)
- STORY-4.3 ukończona: hooki `useHouseholdMembers`, `useInvites`, `useRevokeInvite` są zmigrowane i działają z React Query
- Routing `/home/*` działa (layout `(home)` z nawigacją boczną)
- Globalny layout ciemny: background `#13111c`, sidepanel `#1a1730`, border `#2a2540`
- Komponent `<PermissionGate>` lub HOC sprawdzający rolę istnieje (z EPIC-3)

---

## ✅ Acceptance Criteria

### AC-1: Strona jest dostępna dla ról HELPER_PLUS i ADMIN, niedostępna dla HELPER
GIVEN: Użytkownik z rolą `HELPER` jest zalogowany i posiada aktywną sesję JWT
WHEN: Wchodzi na URL `/home/household` (bezpośrednio przez pasek adresu lub link)
THEN: Nie widzi treści strony — system przekierowuje go na `/home` (lub wyświetla komunikat "Brak dostępu" z przyciskiem "Wróć do strony głównej")
AND: Użytkownik z rolą `HELPER_PLUS` lub `ADMIN` widzi pełną treść strony bez przekierowania

### AC-2: Sekcja HouseholdMembers wyświetla listę członków z avatarami i rolami
GIVEN: Zalogowany użytkownik z rolą `ADMIN` lub `HELPER_PLUS` jest na stronie `/home/household`
AND: Household ma 3 członków: Angelika (ADMIN, email angelika@example.com), Zuza (HELPER+, email zuza@example.com), Iza (HELPER, email iza@example.com)
WHEN: Strona jest w pełni załadowana (hook `useHouseholdMembers` zwrócił dane)
THEN: Wyświetlona jest lista 3 elementów, każdy zawierający:
- Avatar z inicjałami (np. "AK" dla Angeliki Kowalskiej, lub pierwsza litera imienia jeśli tylko imię)
- Pełne imię i nazwisko (display_name) — `font-size: 13px`, `color: #e6edf3`
- Adres email — `font-size: 11px`, `color: #6b7280`
- Badge roli: "ADMIN" (background `#2d1b4a`, color `#c4b5fd`) lub "HELPER+" (background `#1a3a1a`, color `#4ade80`) lub "HELPER" (background `#2a2540`, color `#6b7280`)
AND: Lista jest posortowana: ADMIN na górze, potem HELPER+, potem HELPER

### AC-3: ADMIN może usunąć innego członka household (nie siebie)
GIVEN: Zalogowany użytkownik Mariusz z rolą `ADMIN` jest na stronie `/home/household`
AND: Lista wyświetla memberów: Mariusz (ADMIN), Zuza (HELPER)
WHEN: Mariusz klika przycisk "Usuń" (ikona kosza lub tekst "Usuń") obok wiersza Zuzy
THEN: Pojawia się dialog potwierdzenia: "Czy na pewno chcesz usunąć Zuza z household? Ta operacja jest nieodwracalna."
AND: Dialog ma dwa przyciski: "Anuluj" (tło `#2a2540`) i "Usuń" (tło `#dc2626`, kolor `#fff`)
WHEN: Mariusz klika "Usuń" w dialogu
THEN: System wywołuje `DELETE /api/home/household/members/{member_id}`
AND: Po odpowiedzi 200 wyświetla toast "Zuza została usunięta z household" (czas: 3 sekundy)
AND: Lista memberów jest automatycznie odświeżona — Zuza znika bez przeładowania strony

### AC-4: ADMIN nie może usunąć samego siebie z household
GIVEN: Zalogowany użytkownik Mariusz z rolą `ADMIN` jest na stronie `/home/household`
WHEN: Wiersz listy odpowiadający zalogowanemu userowi (Mariusz) jest wyświetlony
THEN: Przycisk "Usuń" jest niewidoczny (hidden) lub disabled dla wiersza własnego usera
AND: Tooltip przy próbie interakcji (jeśli button disabled): "Nie możesz usunąć samego siebie"

### AC-5: HELPER_PLUS nie widzi przycisku "Usuń" dla żadnego członka
GIVEN: Zalogowany użytkownik Zuza z rolą `HELPER_PLUS` jest na stronie `/home/household`
WHEN: Lista członków jest załadowana
THEN: Żaden wiersz nie posiada przycisku "Usuń" — przycisk jest całkowicie nieobecny w DOM (warunek renderowania: `{currentUserRole === 'ADMIN' && member.user_id !== currentUserId && <DeleteButton />}`)

### AC-6: InviteForm — zaproszenie do household (nie auth invite)
GIVEN: Zalogowany użytkownik z rolą `ADMIN` jest na stronie `/home/household`
WHEN: Wpisuje `nowa.osoba@example.com` w pole email i klika przycisk "Zaproś do household"
THEN: System wysyła `POST /api/home/household/invite` z body `{ "email": "nowa.osoba@example.com" }` (NIE do Supabase Auth signUp — to jest zaproszenie household-specific, generujące token zaproszenia w tabeli household_invites)
AND: Pole email zostaje wyczyszczone
AND: Pojawia się toast sukcesu: "Zaproszenie wysłane do nowa.osoba@example.com" (3 sekundy)
AND: Lista PendingInvites automatycznie się odświeża — widoczny nowy rekord zaproszenia

### AC-7: InviteForm waliduje email przed wysłaniem
GIVEN: Pole email w formularzu jest puste lub zawiera "nievalidemail"
WHEN: Użytkownik klika "Zaproś do household"
THEN: Formularz NIE wysyła requestu HTTP
AND: Pod polem email pojawia się komunikat błędu: "Podaj poprawny adres email" (color: `#f85149`, font-size: 11px)
AND: Pole email otrzymuje focus i border-color `#dc2626`

### AC-8: PendingInvites wyświetla oczekujące zaproszenia z przyciskiem "Anuluj"
GIVEN: Istnieje 2 oczekujące zaproszenia: zuza.nowa@example.com (wysłane 10 minut temu, wygasa za 6 dni), test@example.com (wysłane 3 dni temu, wygasa za 4 dni)
WHEN: Zalogowany ADMIN lub HELPER_PLUS jest na stronie `/home/household`
THEN: Wyświetlone są dwa wiersze z:
- Email zaproszenia (font-size: 12px, color: #e6edf3)
- Czas wysłania (relatywny, np. "10 minut temu") i czas wygaśnięcia (np. "Wygasa za 6 dni") — font-size: 10px, color: #6b7280
- Przycisk "Anuluj" (variant ghost, size sm)
WHEN: ADMIN klika "Anuluj" obok zaproszenia zuza.nowa@example.com
THEN: System wywołuje `DELETE /api/home/household/invite/{invite_id}` lub `PATCH` ze statusem revoked
AND: Toast: "Zaproszenie anulowane" (3 sekundy)
AND: Wiersz znika z listy PendingInvites bez przeładowania strony

### AC-9: Stany loading i empty działają poprawnie
GIVEN: Hook `useHouseholdMembers` jest w stanie `isLoading: true`
WHEN: Strona się ładuje
THEN: W miejscu listy memberów widoczny jest skeleton: 3 wiersze z szarymi prostokątami (animate-pulse, background `#2a2540`)
AND: W miejscu PendingInvites widoczny jest analogiczny skeleton: 2 wiersze
GIVEN: Household nie ma żadnych oczekujących zaproszeń
WHEN: Hook `useInvites` zwraca pustą tablicę
THEN: W sekcji PendingInvites wyświetlony jest tekst "Brak oczekujących zaproszeń" (color: `#4b4569`, font-size: 12px)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home/household`
Komponent główny: `src/app/(home)/household/page.tsx`
Pliki docelowe:
- `src/components/home/household/HouseholdMembers.tsx`
- `src/components/home/household/InviteForm.tsx`
- `src/components/home/household/PendingInvites.tsx`

### Instrukcja migracji (krok po kroku)

1. Skopiuj pliki z `archive/src/components/household/` do `src/components/home/household/`
2. Zaktualizuj import paths — zmień `@/lib/hooks/useHouseholdMembers` → `@/lib/hooks/home/useHouseholdMembers` (lub zgodnie z nową strukturą projektu)
3. Zaktualizuj import `@/components/ui/button` → sprawdź czy path istnieje w nowym projekcie; jeśli nie, dostosuj do `src/components/ui/button`
4. Zastąp wszystkie Tailwind klasy light-theme dark-theme classes (patrz tabela poniżej)
5. W `HouseholdMembers.tsx` — dodaj avatar z inicjałami, email, przycisk "Usuń" z logiką warunkową
6. W `InviteForm.tsx` — zmień endpoint z archiwum (był `/api/invites`) na `/api/home/household/invite`
7. W `PendingInvites.tsx` — zmień tekst przycisku z "Revoke" na "Anuluj", dodaj polskie komunikaty czasowe
8. Stwórz `src/app/(home)/household/page.tsx` z role guard i złożeniem 3 komponentów

### Restyling dark theme — zamiana klas

| Archive (light) | Nowy (dark) |
|-----------------|-------------|
| `bg-gray-50` | `bg-[#1a1730]` |
| `bg-white` | `bg-[#13111c]` |
| `bg-blue-100 text-blue-800` | `bg-[#2d1b4a] text-[#c4b5fd]` (dla ADMIN badge) |
| `text-gray-500` | `text-[#6b7280]` |
| `text-red-500` | `text-[#f85149]` |
| `rounded-lg` | `rounded-lg border border-[#2a2540]` |
| `border` domyślne | `border-[#2a2540]` |
| `text-gray-700` / `font-medium` | `text-[#e6edf3]` |

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `HouseholdMembers` | Lista | `currentUserId`, `currentUserRole` | loading (skeleton), error, empty, filled |
| `MemberRow` | List item | `member`, `canDelete`, `onDelete` | default, hover (show delete btn) |
| `InviteForm` | Form | brak (samodzielny, pobiera dane z hooka) | idle, pending (disabled), success (toast), error |
| `PendingInvites` | Lista | brak | loading (skeleton), empty, filled |
| `ConfirmDeleteDialog` | Modal | `memberName`, `onConfirm`, `onCancel` | open/closed |

### Pola formularza InviteForm

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| email | email | `^[^\s@]+@[^\s@]+\.[^\s@]+$` | "Podaj poprawny adres email" | tak |

### Avatar z inicjałami — logika generowania

```tsx
// Wstaw tę funkcję do HouseholdMembers.tsx lub utils
function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

// Kolor avatara zależy od user_id (deterministyczny, nie random):
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #ec4899, #f97316)',  // pink-orange
  'linear-gradient(135deg, #a78bfa, #60a5fa)',  // purple-blue
  'linear-gradient(135deg, #3b82f6, #06b6d4)',  // blue-cyan
  'linear-gradient(135deg, #34d399, #06b6d4)',  // green-cyan
];

function getAvatarGradient(userId: string): string {
  const charSum = userId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[charSum % AVATAR_GRADIENTS.length];
}
```

### Stany widoku

**Loading:**
Każdy z 3 komponentów pokazuje własny skeleton:
- `HouseholdMembers`: 3 wiersze `<div className="animate-pulse h-14 rounded-lg bg-[#2a2540]" />`
- `PendingInvites`: 2 wiersze analogiczne
- `InviteForm`: formularz renderuje się normalnie (nie ma stanu loading przy montowaniu)

**Empty (brak danych):**
- Members: "Brak członków household. Wyślij zaproszenie poniżej." (color: `#4b4569`)
- PendingInvites: "Brak oczekujących zaproszeń" (color: `#4b4569`)

**Error (błąd serwera/sieci):**
- Members: "Nie udało się załadować członków. Spróbuj ponownie." + przycisk "Odśwież" (wywołuje `refetch()`)
- PendingInvites: "Nie udało się załadować zaproszeń. Spróbuj ponownie."
- InviteForm po błędzie POST: "Nie udało się wysłać zaproszenia. Spróbuj ponownie." — pod polem email

**Filled (normalny stan):**
Lista kart z avatarem, nazwą, emailem, rolą. Przycisk "Usuń" widoczny tylko dla ADMIN przy rekordach innych userów.

### Struktura strony `/home/household` (page.tsx)

```tsx
// src/app/(home)/household/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server'; // z EPIC-3
import { HouseholdMembers } from '@/components/home/household/HouseholdMembers';
import { InviteForm } from '@/components/home/household/InviteForm';
import { PendingInvites } from '@/components/home/household/PendingInvites';

export default async function HouseholdPage() {
  const session = await getServerSession();

  // Role guard — server-side
  const allowedRoles = ['ADMIN', 'HELPER_PLUS'];
  if (!session || !allowedRoles.includes(session.user.role)) {
    redirect('/home');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-xl font-bold text-[#e6edf3]">👥 Zarządzanie Household</h1>

      {/* Sekcja 1: Aktualni członkowie */}
      <section>
        <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
          Członkowie rodziny
        </h2>
        <HouseholdMembers
          currentUserId={session.user.id}
          currentUserRole={session.user.role}
        />
      </section>

      {/* Sekcja 2: Zaproś (tylko ADMIN) */}
      {session.user.role === 'ADMIN' && (
        <section>
          <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            Zaproś do household
          </h2>
          <div className="bg-[#1a1730] border border-[#2a2540] rounded-lg p-4">
            <InviteForm />
          </div>
        </section>
      )}

      {/* Sekcja 3: Oczekujące zaproszenia */}
      <section>
        <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
          Oczekujące zaproszenia
        </h2>
        <PendingInvites />
      </section>
    </div>
  );
}
```

### Flow interakcji (krok po kroku)

```
1. User (HELPER) wchodzi na /home/household
   → Serwer sprawdza rolę z sesji → redirect('/home')

2. User (ADMIN) wchodzi na /home/household
   → Strona renderuje 3 sekcje
   → HouseholdMembers: wywołuje useHouseholdMembers() → GET /api/home/household/members
   → Skeleton przez czas ładowania (~300-800ms)
   → Dane załadowane → lista 3 kart z avatarami

3. User klika "Zaproś do household" po wpisaniu email:
   a) Walidacja: email pusty/błędny → komunikat pod polem, request NIE idzie
   b) Walidacja OK → InviteForm.mutate({ email }) → POST /api/home/household/invite
   c) Button "Zaproś" disabled + tekst "Wysyłanie..." podczas requestu
   d) Odpowiedź 200 → email field czyszczone → toast "Zaproszenie wysłane"
   e) invalidateQueries(['invites']) → PendingInvites odświeża się

4. User klika "Usuń" obok Zuzy:
   a) Pojawia się ConfirmDeleteDialog z nazwą
   b) User klika "Anuluj" → dialog zamknięty, brak akcji
   b) User klika "Usuń" → DELETE /api/home/household/members/{zuza_member_id}
   c) Button w dialogu: disabled + spinner
   d) Odpowiedź 200 → toast "Zuza została usunięta z household"
   e) invalidateQueries(['household-members']) → lista odświeżona

5. User klika "Anuluj" obok zaproszenia:
   a) Bez dialogu potwierdzenia (revoke jest odwracalny — można ponownie zaprosić)
   b) DELETE /api/home/household/invite/{invite_id}
   c) Button disabled podczas requestu
   d) Toast "Zaproszenie anulowane"
   e) invalidateQueries(['invites'])
```

### Responsive / Dostępność
- Mobile (375px+): Komponenty stackują się pionowo (flex-col), avatar 36px, role badge poniżej emaila w osobnej linii
- Tablet (768px+): Layout jak mobile, ale padding 24px
- Desktop (1280px+): `max-w-2xl mx-auto` — treść wyśrodkowana
- Keyboard navigation: Tab przechodzi przez wiersze listy, Enter na przycisku "Usuń" otwiera dialog, Escape zamyka dialog
- ARIA: `aria-label="Usuń {memberName} z household"` na przycisku delete, `role="dialog"` na modalu potwierdzenia, `aria-live="polite"` na strefie toastów

---

## ⚠️ Edge Cases

### EC-1: Zaproszenie wysłane na email który już jest członkiem
Scenariusz: Admin wysyła zaproszenie na `zuza@example.com`, która już jest w household_members
Oczekiwane zachowanie: Backend zwraca 409 Conflict; InviteForm wyświetla pod polem email: "Ten adres email jest już członkiem household"
Komunikat dla użytkownika: "Ten adres email jest już członkiem household"

### EC-2: Zaproszenie wysłane na email który ma już oczekujące zaproszenie
Scenariusz: Admin wysyła zaproszenie na `iza@example.com`, która ma status `pending` w invite list
Oczekiwane zachowanie: Backend zwraca 409; komunikat: "Zaproszenie na ten adres email już oczekuje — sprawdź listę poniżej"
Komunikat dla użytkownika: "Zaproszenie na ten adres email już oczekuje"

### EC-3: Utrata połączenia sieciowego podczas DELETE member
Scenariusz: User klika "Usuń", potwierdza, sieć pada w trakcie requestu
Oczekiwane zachowanie: Przycisk "Usuń" w dialogu odblokowany po timeout (~10s), dialog pozostaje otwarty; toast error: "Nie udało się usunąć. Sprawdź połączenie i spróbuj ponownie."
Komunikat dla użytkownika: "Nie udało się usunąć. Sprawdź połączenie i spróbuj ponownie."

### EC-4: Ostatni ADMIN próbuje usunąć siebie (hipotetycznie przez API)
Scenariusz: Household ma jednego ADMIN, który próbuje usunąć sam siebie przez manipulację UI
Oczekiwane zachowanie: Backend zwraca 403 "Nie możesz usunąć jedynego administratora household"; UI pokazuje: "Nie można usunąć — jesteś jedynym administratorem. Najpierw nadaj innej osobie rolę ADMIN."
Komunikat dla użytkownika: "Nie można usunąć — jesteś jedynym administratorem"

---

## 🚫 Out of Scope tej Story
- Zmiana roli członka (np. HELPER → HELPER+) — osobna story lub settings
- Tworzenie nowego household (onboarding flow) — EPIC-3 lub osobna story
- Opuszczanie household przez samego siebie (nie-ADMIN) — nie istnieje w MVP
- Email template dla zaproszenia — backend (STORY-4.2) lub osobna story
- Household settings (zmiana nazwy) — settings page, osobna story
- Sortowanie/filtrowanie listy członków — nie w MVP

---

## ✔️ Definition of Done
- [ ] Pliki docelowe istnieją: `src/components/home/household/{HouseholdMembers,InviteForm,PendingInvites}.tsx`
- [ ] `src/app/(home)/household/page.tsx` istnieje z server-side role guard (redirect dla HELPER)
- [ ] Wszystkie 4 stany widoku zaimplementowane: loading (skeleton), empty, error (retry), filled
- [ ] HouseholdMembers wyświetla avatar z inicjałami, imię, email, badge roli
- [ ] Przycisk "Usuń" widoczny tylko dla ADMIN i niewidoczny dla własnego wiersza
- [ ] ConfirmDeleteDialog pojawia się przed DELETE i znika po potwierdzeniu
- [ ] InviteForm wysyła POST `/api/home/household/invite` (nie auth invite, nie `/api/invites`)
- [ ] Walidacja email działa po stronie klienta (przed submitem)
- [ ] PendingInvites pokazuje czas relatywny (polska wersja: "10 minut temu", "3 dni temu")
- [ ] Przycisk "Anuluj" w PendingInvites wywołuje właściwy endpoint revoke
- [ ] Dark theme: background `#13111c`/`#1a1730`, border `#2a2540`, tekst `#e6edf3`
- [ ] Brak `bg-white`, `bg-gray-50`, `text-gray-500` (light theme) w nowych komponentach
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
