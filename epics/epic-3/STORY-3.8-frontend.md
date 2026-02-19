---
story_id: STORY-3.8
title: "Strona /settings/users — ADMIN zarządza użytkownikami (invite, zmiana roli, usunięcie)"
epic: EPIC-3
module: auth
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: /Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html
api_reference: /api/users, /api/users/invite, /api/users/[id]/role, /api/users/[id]
priority: must
estimated_effort: 12h
depends_on: STORY-3.4, STORY-3.5, STORY-3.7
blocks: none
tags: [user-management, settings, admin, table, invite, role-change, delete, PermissionGate, rbac]
---

## 🎯 User Story

**Jako** Mariusz (ADMIN) korzystający z Kira Dashboard
**Chcę** mieć stronę `/settings/users` gdzie mogę zapraszać nowych użytkowników, zmieniać im role i usuwać ich z systemu
**Żeby** zarządzać dostępem rodziny do dashboardu bez edytowania bazy danych ręcznie

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/settings/users`
Plik strony: `src/app/(dashboard)/settings/users/page.tsx`
Folder na komponenty: `src/components/users/`

### Powiązane pliki (do stworzenia przez tę story)

```
kira-dashboard/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── settings/
│   │           └── users/
│   │               └── page.tsx             ← NOWY — główna strona
│   └── components/
│       └── users/
│           ├── UserManagementPage.tsx        ← NOWY — główny komponent strony
│           ├── UsersTable.tsx                ← NOWY — tabela użytkowników
│           ├── RoleBadge.tsx                 ← NOWY — badge z kolorem roli
│           ├── InviteUserForm.tsx            ← NOWY — formularz zapraszania
│           ├── ChangeRoleDropdown.tsx        ← NOWY — dropdown zmiany roli per row
│           └── DeleteUserButton.tsx          ← NOWY — przycisk usunięcia z confirm
```

### Endpointy API (zaimplementowane w STORY-3.4)

| Endpoint | Metoda | Body | Odpowiedź sukces | Błędy |
|----------|--------|------|------------------|-------|
| `/api/users` | GET | — | `{ users: UserRow[] }` 200 | 401, 403 |
| `/api/users/invite` | POST | `{ email: string, role: Role }` | `{ message: "Zaproszenie wysłane" }` 200 | 400, 401, 403, 409 |
| `/api/users/[id]/role` | PATCH | `{ role: Role }` | `{ message: "Rola zaktualizowana" }` 200 | 400, 401, 403, 404 |
| `/api/users/[id]` | DELETE | — | `{ message: "Użytkownik usunięty" }` 200 | 401, 403, 404 |

Typ `UserRow` (zwracany przez GET /api/users):
```typescript
interface UserRow {
  id: string;         // UUID — Supabase auth user id
  email: string;      // adres email
  role: Role;         // 'ADMIN' | 'HELPER_PLUS' | 'HELPER'
  created_at: string; // ISO 8601 string, np. "2026-02-19T10:00:00Z"
}
```

Typ `Role` (z STORY-3.5):
```typescript
type Role = 'ADMIN' | 'HELPER_PLUS' | 'HELPER';
```

### Stan systemu przed tą story
- **STORY-3.4 DONE**: Endpointy `/api/users`, `/api/users/invite`, `/api/users/[id]/role`, `/api/users/[id]` istnieją i działają. ADMIN-only (403 dla innych ról).
- **STORY-3.5 DONE**: `useUser()`, `usePermissions()`, `PermissionGate` dostępne z `@/contexts/RoleContext` i `@/components/auth/PermissionGate`
- **STORY-3.7 DONE**: Sidebar zawiera link "Users" w sekcji "Settings" (widoczny dla ADMIN) prowadzący do `/settings/users`
- `shadcn/ui` skonfigurowany: dostępne komponenty `Button`, `Input`, `Select`, `Dialog`, `Toast` (via `sonner`)
- `Toaster` z biblioteki `sonner` zamontowany w `src/app/providers.tsx`

### Dostęp do strony
Strona `/settings/users` jest chroniona przez dwa mechanizmy:
1. **Middleware (STORY-3.3)**: Trasa `/settings/*` jest dostępna tylko dla ADMIN na poziomie Next.js middleware — inne role są przekierowywane na `/home` lub `/403`
2. **PermissionGate (STORY-3.5)**: Jako dodatkowe zabezpieczenie, cała strona jest owinięta w `<PermissionGate require="canManageUsers">` z fallbackiem 403

---

## ✅ Acceptance Criteria

### AC-1: Strona /settings/users wyświetla tabelę użytkowników dla ADMIN
GIVEN: Mariusz (ADMIN) jest zalogowany i nawiguje do `/settings/users`
AND: `GET /api/users` zwraca `{ users: [{ id: "uuid-1", email: "mariusz@rodzina.pl", role: "ADMIN", created_at: "2026-01-01T10:00:00Z" }, { id: "uuid-2", email: "angelika@rodzina.pl", role: "HELPER_PLUS", created_at: "2026-01-15T12:00:00Z" }] }`
WHEN: Strona się ładuje
THEN: Wyświetla się tabela z 2 wierszami — po jednym na użytkownika
AND: Tabela ma kolumny w kolejności: "Email", "Rola", "Data dodania", "Akcje"
AND: Wiersz 1: email "mariusz@rodzina.pl", badge "ADMIN" (kolor fioletowy), data "1 sty 2026", akcje zablokowane (własne konto)
AND: Wiersz 2: email "angelika@rodzina.pl", badge "HELPER+" (kolor niebieski), data "15 sty 2026", akcje aktywne

### AC-2: Non-ADMIN widzi stronę 403 zamiast tabeli
GIVEN: Angelika (HELPER_PLUS) jest zalogowana
WHEN: Angelika nawiguje bezpośrednio do `/settings/users` (np. wpisując URL ręcznie — middleware może nie zawsze blokować SSR)
THEN: Strona renderuje komunikat błędu "Brak dostępu" zamiast tabeli
AND: Komunikat zawiera tekst: "Nie masz uprawnień do tej strony."
AND: Na stronie widoczny jest link lub przycisk "Wróć do strony głównej" prowadzący do `/home`
AND: Tabela użytkowników NIE jest widoczna

### AC-3: Formularz invite — wysłanie zaproszenia
GIVEN: ADMIN jest na stronie `/settings/users`
AND: Formularz invite jest widoczny w górnej części strony (ponad tabelą)
WHEN: ADMIN wpisuje "nowyuser@rodzina.pl" w polu Email
AND: ADMIN wybiera rolę "HELPER" z select
AND: ADMIN klika przycisk "Zaproś"
THEN: Wykonywane jest żądanie `POST /api/users/invite` z body `{ email: "nowyuser@rodzina.pl", role: "HELPER" }`
AND: Przycisk "Zaproś" jest w stanie loading (disabled, spinner lub tekst "Zapraszanie...")
AND: Po otrzymaniu odpowiedzi 200 wyświetla się toast z komunikatem: "Zaproszenie wysłane na nowyuser@rodzina.pl"
AND: Formularz jest wyczyszczony (pola Email i Role wracają do stanu domyślnego)
AND: Tabela użytkowników jest odświeżana (ponowne wywołanie `GET /api/users`)

### AC-4: Formularz invite — walidacja pól
GIVEN: ADMIN jest na stronie `/settings/users` z pustym formularzem
WHEN: ADMIN klika "Zaproś" bez wypełnienia pól
THEN: Przy polu Email pojawia się komunikat: "Adres email jest wymagany"
AND: Przy polu Role pojawia się komunikat: "Rola jest wymagana"
AND: Żądanie `POST /api/users/invite` NIE jest wysyłane

GIVEN: ADMIN wpisał "to-nie-jest-email" w polu Email
WHEN: ADMIN opuszcza pole (onBlur) lub klika "Zaproś"
THEN: Przy polu Email pojawia się komunikat: "Nieprawidłowy format adresu email"

### AC-5: Zmiana roli użytkownika
GIVEN: ADMIN widzi tabelę z użytkownikiem "angelika@rodzina.pl" (HELPER_PLUS)
AND: Wiersz Angeliki ma dropdown "Zmień rolę" z opcjami: ADMIN, HELPER+, HELPER
WHEN: ADMIN klika dropdown i wybiera "HELPER"
THEN: Wyświetla się modal potwierdzenia z pytaniem: "Zmienić rolę angelika@rodzina.pl z HELPER+ na HELPER?"
AND: Modal ma 2 przyciski: "Potwierdź" i "Anuluj"
WHEN: ADMIN klika "Potwierdź"
THEN: Wykonywane jest żądanie `PATCH /api/users/[id-angeliki]/role` z body `{ role: "HELPER" }`
AND: Wyświetla się toast: "Rola angelika@rodzina.pl zmieniona na HELPER"
AND: Badge roli w tabeli zmienia kolor z niebieskiego (HELPER+) na szary (HELPER) — tabela jest odświeżana

### AC-6: Usunięcie użytkownika z systemu
GIVEN: ADMIN widzi tabelę z użytkownikiem "zuza@rodzina.pl" (HELPER)
WHEN: ADMIN klika przycisk "Usuń" w wierszu Zuzy
THEN: Wyświetla się modal potwierdzenia: "Czy na pewno chcesz usunąć użytkownika zuza@rodzina.pl? Tej operacji nie można cofnąć."
AND: Modal ma 2 przyciski: "Usuń" (czerwony) i "Anuluj"
WHEN: ADMIN klika czerwony przycisk "Usuń"
THEN: Wykonywane jest żądanie `DELETE /api/users/[id-zuzy]`
AND: Wyświetla się toast: "Użytkownik zuza@rodzina.pl został usunięty"
AND: Wiersz Zuzy znika z tabeli (tabela odświeżana)

### AC-7: Akcje na własnym koncie są zablokowane
GIVEN: Mariusz (ADMIN, email: "mariusz@rodzina.pl") jest zalogowany
AND: `useUser()` zwraca `{ user: { id: "uuid-admin", email: "mariusz@rodzina.pl" }, role: "ADMIN" }`
WHEN: ADMIN widzi tabelę i swój wiersz (email "mariusz@rodzina.pl")
THEN: Dropdown "Zmień rolę" jest `disabled` (szary, nie klikalny)
AND: Przycisk "Usuń" jest `disabled` (szary, nie klikalny)
AND: Tooltip na wyłączonych akcjach wyświetla: "Nie możesz modyfikować własnego konta"

### AC-8: Empty state gdy brak innych użytkowników
GIVEN: W systemie jest tylko 1 użytkownik: "mariusz@rodzina.pl" (ADMIN)
AND: `GET /api/users` zwraca `{ users: [{ id: "uuid-admin", email: "mariusz@rodzina.pl", role: "ADMIN", created_at: "..." }] }`
WHEN: ADMIN wchodzi na `/settings/users`
THEN: Tabela wyświetla 1 wiersz (własne konto ADMIN)
AND: Pod tabelą (lub nad formularzem) widoczny jest empty state: "Nie ma jeszcze innych użytkowników. Zaproś kogoś powyżej!" 
AND: Formularz invite jest widoczny i aktywny

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/settings/users`
Plik: `src/app/(dashboard)/settings/users/page.tsx`
Główny komponent: `src/components/users/UserManagementPage.tsx`

### Implementacja krok po kroku

#### Krok 1 — `src/app/(dashboard)/settings/users/page.tsx`

```typescript
// src/app/(dashboard)/settings/users/page.tsx
import { PermissionGate } from '@/components/auth/PermissionGate';
import { UserManagementPage } from '@/components/users/UserManagementPage';

// Fallback dla non-ADMIN: prosty komunikat 403
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-4xl" aria-hidden="true">🔒</div>
      <h2 className="text-[18px] font-bold text-[#e6edf3]">Brak dostępu</h2>
      <p className="text-[14px] text-[#6b7280]">Nie masz uprawnień do tej strony.</p>
      <a
        href="/home"
        className="px-4 py-2 bg-[#2a2540] text-[#e6edf3] rounded-lg text-[13px]
                   hover:bg-[#3b3d7a] transition-colors"
      >
        Wróć do strony głównej
      </a>
    </div>
  );
}

// Strona settings/users — Server Component (Next.js App Router)
// PermissionGate jest 'use client', więc strona musi być Client Component
// lub używamy dynamicznego importu. Prostsze: cały plik jako Client Component.
export default function UsersPage() {
  return (
    <PermissionGate require="canManageUsers" fallback={<AccessDenied />}>
      <UserManagementPage />
    </PermissionGate>
  );
}
```

**UWAGA**: `PermissionGate` jest `'use client'`. Jeśli `page.tsx` jest Server Component, Next.js zgłosi błąd przy użyciu client-only hooków. Dodaj dyrektywę `'use client'` na początku `page.tsx` albo przenieś PermissionGate do `UserManagementPage.tsx`.

Preferowane rozwiązanie — `page.tsx` jako Server Component, `UserManagementPage.tsx` jako Client Component z PermissionGate wewnątrz:

```typescript
// page.tsx (Server Component — brak 'use client')
import { UserManagementPage } from '@/components/users/UserManagementPage';

export default function UsersPage() {
  return <UserManagementPage />;
}

// UserManagementPage.tsx (Client Component — ma 'use client')
'use client';
// ... PermissionGate tutaj
```

#### Krok 2 — `src/components/users/RoleBadge.tsx`

```typescript
// src/components/users/RoleBadge.tsx
'use client';

import type { Role } from '@/types/auth.types';

interface RoleBadgeProps {
  role: Role;
}

// Kolory zgodne z mockupem kira-dashboard-mockup-v3.html i STORY-3.7
const ROLE_STYLES: Record<Role, { bg: string; text: string; label: string }> = {
  ADMIN:       { bg: 'bg-[#2d1b4a]', text: 'text-[#a78bfa]', label: 'ADMIN' },
  HELPER_PLUS: { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]', label: 'HELPER+' },
  HELPER:      { bg: 'bg-[#2a2540]', text: 'text-[#9ca3af]', label: 'HELPER' },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const style = ROLE_STYLES[role];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${style.bg} ${style.text}`}
      aria-label={`Rola: ${role}`}
    >
      {style.label}
    </span>
  );
}
```

#### Krok 3 — `src/components/users/UsersTable.tsx`

```typescript
// src/components/users/UsersTable.tsx
'use client';

import { useUser } from '@/contexts/RoleContext';
import { RoleBadge } from './RoleBadge';
import { ChangeRoleDropdown } from './ChangeRoleDropdown';
import { DeleteUserButton } from './DeleteUserButton';
import type { UserRow } from '@/types/users.types';  // zdefiniuj poniżej

// Formatuje ISO date na czytelną polską datę: "2026-01-15T12:00:00Z" → "15 sty 2026"
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface UsersTableProps {
  users: UserRow[];
  onRoleChanged: () => void;   // callback po udanej zmianie roli → odśwież listę
  onUserDeleted: () => void;   // callback po udanym usunięciu → odśwież listę
}

export function UsersTable({ users, onRoleChanged, onUserDeleted }: UsersTableProps) {
  const { user: currentUser } = useUser();

  if (users.length === 0) {
    return (
      <div className="text-center py-10 text-[#6b7280] text-[14px]">
        Brak użytkowników do wyświetlenia.
      </div>
    );
  }

  // Filtruj własne konto dla empty state message
  const otherUsers = users.filter(u => u.id !== currentUser?.id);

  return (
    <div className="w-full overflow-x-auto">
      {/* Empty state — tylko ADMIN w tabeli */}
      {otherUsers.length === 0 && (
        <div className="mb-4 p-3 bg-[#13111c] border border-[#2a2540] rounded-lg text-[13px] text-[#6b7280] text-center">
          Nie ma jeszcze innych użytkowników. Zaproś kogoś powyżej!
        </div>
      )}

      <table className="w-full" role="table" aria-label="Lista użytkowników">
        <thead>
          <tr className="text-left border-b border-[#2a2540]">
            <th className="pb-2.5 text-[11px] font-bold text-[#4b4569] uppercase tracking-[0.07em] pr-4">
              Email
            </th>
            <th className="pb-2.5 text-[11px] font-bold text-[#4b4569] uppercase tracking-[0.07em] pr-4">
              Rola
            </th>
            <th className="pb-2.5 text-[11px] font-bold text-[#4b4569] uppercase tracking-[0.07em] pr-4">
              Data dodania
            </th>
            <th className="pb-2.5 text-[11px] font-bold text-[#4b4569] uppercase tracking-[0.07em]">
              Akcje
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            const isOwnAccount = user.id === currentUser?.id;

            return (
              <tr
                key={user.id}
                className="border-b border-[#2a2540] last:border-b-0"
              >
                {/* Email */}
                <td className="py-3 pr-4">
                  <span className="text-[13px] text-[#e6edf3]">{user.email}</span>
                </td>

                {/* Rola — kolorowy badge */}
                <td className="py-3 pr-4">
                  <RoleBadge role={user.role} />
                </td>

                {/* Data dodania */}
                <td className="py-3 pr-4">
                  <span className="text-[12px] text-[#6b7280]">{formatDate(user.created_at)}</span>
                </td>

                {/* Akcje */}
                <td className="py-3">
                  <div
                    className="flex items-center gap-2"
                    title={isOwnAccount ? 'Nie możesz modyfikować własnego konta' : undefined}
                  >
                    {/* Zmień rolę */}
                    <ChangeRoleDropdown
                      userId={user.id}
                      userEmail={user.email}
                      currentRole={user.role}
                      disabled={isOwnAccount}
                      onRoleChanged={onRoleChanged}
                    />

                    {/* Usuń */}
                    <DeleteUserButton
                      userId={user.id}
                      userEmail={user.email}
                      disabled={isOwnAccount}
                      onUserDeleted={onUserDeleted}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

#### Krok 4 — `src/components/users/InviteUserForm.tsx`

```typescript
// src/components/users/InviteUserForm.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/types/auth.types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN',       label: 'ADMIN' },
  { value: 'HELPER_PLUS', label: 'HELPER+' },
  { value: 'HELPER',      label: 'HELPER' },
];

interface InviteUserFormProps {
  onInviteSuccess: () => void;  // callback po udanym zaproszeniu → odśwież listę
}

// Walidacja emaila — RFC 5322 uproszczona
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function InviteUserForm({ onInviteSuccess }: InviteUserFormProps) {
  const [email, setEmail]     = useState('');
  const [role, setRole]       = useState<Role | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  // Błędy walidacji per pole
  const [emailError, setEmailError] = useState('');
  const [roleError, setRoleError]   = useState('');

  // Walidacja per pole (on blur i on submit)
  function validateEmail(value: string): string {
    if (!value.trim())        return 'Adres email jest wymagany';
    if (!isValidEmail(value)) return 'Nieprawidłowy format adresu email';
    return '';
  }
  function validateRole(value: string): string {
    if (!value) return 'Rola jest wymagana';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Walidacja wszystkich pól przed submittem
    const emailErr = validateEmail(email);
    const roleErr  = validateRole(role);
    setEmailError(emailErr);
    setRoleError(roleErr);

    if (emailErr || roleErr) return;  // zatrzymaj jeśli błędy

    setIsLoading(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Obsługa znanych błędów
        if (res.status === 409) {
          // Użytkownik już istnieje
          setEmailError(`Użytkownik ${email} już istnieje w systemie`);
          return;
        }
        // Ogólny błąd serwera
        toast.error(data.message ?? `Błąd serwera (${res.status}). Spróbuj ponownie.`);
        return;
      }

      // Sukces
      toast.success(`Zaproszenie wysłane na ${email.trim()}`);
      setEmail('');
      setRole('');
      setEmailError('');
      setRoleError('');
      onInviteSuccess();  // odśwież tabelę
    } catch {
      toast.error('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1a1730] border border-[#2a2540] rounded-xl p-4 mb-6"
      aria-label="Formularz zapraszania użytkownika"
      noValidate
    >
      <h2 className="text-[14px] font-bold text-[#e6edf3] mb-3">Zaproś użytkownika</h2>

      <div className="flex gap-3 items-start flex-wrap">
        {/* Email input */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label htmlFor="invite-email" className="text-[11px] text-[#6b7280]">
            Adres email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(''); }}
            onBlur={e => setEmailError(validateEmail(e.target.value))}
            placeholder="np. zuza@rodzina.pl"
            disabled={isLoading}
            className={[
              'bg-[#13111c] border rounded-lg px-3 py-2 text-[13px] text-[#e6edf3]',
              'placeholder-[#4b4569] outline-none transition-colors',
              emailError
                ? 'border-[#f87171] focus:border-[#f87171]'
                : 'border-[#2a2540] focus:border-[#7c3aed]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'invite-email-error' : undefined}
          />
          {emailError && (
            <span id="invite-email-error" className="text-[11px] text-[#f87171]" role="alert">
              {emailError}
            </span>
          )}
        </div>

        {/* Role select */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label htmlFor="invite-role" className="text-[11px] text-[#6b7280]">
            Rola
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={e => { setRole(e.target.value as Role | ''); setRoleError(''); }}
            disabled={isLoading}
            className={[
              'bg-[#13111c] border rounded-lg px-3 py-2 text-[13px] text-[#e6edf3]',
              'outline-none transition-colors cursor-pointer',
              roleError
                ? 'border-[#f87171] focus:border-[#f87171]'
                : 'border-[#2a2540] focus:border-[#7c3aed]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
            aria-invalid={!!roleError}
            aria-describedby={roleError ? 'invite-role-error' : undefined}
          >
            <option value="" disabled>Wybierz rolę</option>
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {roleError && (
            <span id="invite-role-error" className="text-[11px] text-[#f87171]" role="alert">
              {roleError}
            </span>
          )}
        </div>

        {/* Submit button — wyrównany do dolnej linii inputów */}
        <div className="flex flex-col justify-end pb-0">
          <label className="text-[11px] text-transparent select-none">btn</label>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white
                       rounded-lg text-[13px] font-semibold cursor-pointer
                       hover:opacity-90 transition-opacity
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1.5 min-w-[90px] justify-center"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Zapraszanie...
              </>
            ) : (
              'Zaproś'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
```

#### Krok 5 — `src/components/users/ChangeRoleDropdown.tsx`

```typescript
// src/components/users/ChangeRoleDropdown.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/types/auth.types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN',       label: 'ADMIN' },
  { value: 'HELPER_PLUS', label: 'HELPER+' },
  { value: 'HELPER',      label: 'HELPER' },
];

// Mapowanie skrótów na pełne nazwy dla komunikatów
const ROLE_DISPLAY: Record<Role, string> = {
  ADMIN:       'ADMIN',
  HELPER_PLUS: 'HELPER+',
  HELPER:      'HELPER',
};

interface ChangeRoleDropdownProps {
  userId: string;
  userEmail: string;
  currentRole: Role;
  disabled: boolean;
  onRoleChanged: () => void;
}

export function ChangeRoleDropdown({
  userId, userEmail, currentRole, disabled, onRoleChanged
}: ChangeRoleDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmData, setConfirmData] = useState<{ newRole: Role } | null>(null);

  async function handleRoleChange(newRole: Role) {
    if (newRole === currentRole) return;  // bez zmian — nie otwieraj modalu
    setConfirmData({ newRole });
  }

  async function confirmChange() {
    if (!confirmData) return;
    const { newRole } = confirmData;

    setIsLoading(true);
    setConfirmData(null);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? `Błąd zmiany roli (${res.status}). Spróbuj ponownie.`);
        return;
      }

      toast.success(`Rola ${userEmail} zmieniona na ${ROLE_DISPLAY[newRole]}`);
      onRoleChanged();  // odśwież tabelę
    } catch {
      toast.error('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Select dropdown */}
      <select
        value={currentRole}
        onChange={e => handleRoleChange(e.target.value as Role)}
        disabled={disabled || isLoading}
        className={[
          'bg-[#13111c] border border-[#2a2540] rounded-lg px-2 py-1',
          'text-[12px] text-[#e6edf3] outline-none transition-colors cursor-pointer',
          'focus:border-[#7c3aed]',
          (disabled || isLoading) && 'opacity-40 cursor-not-allowed',
        ].filter(Boolean).join(' ')}
        aria-label={`Zmień rolę ${userEmail}`}
        title={disabled ? 'Nie możesz modyfikować własnego konta' : undefined}
      >
        {ROLES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* Modal potwierdzenia zmiany roli */}
      {confirmData && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-role-title"
          onClick={e => { if (e.target === e.currentTarget) setConfirmData(null); }}
        >
          <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-2xl w-[480px] max-w-[90vw] shadow-xl">
            <div className="p-5 border-b border-[#2a2540]">
              <h3 id="confirm-role-title" className="text-[16px] font-bold text-[#e6edf3]">
                Zmiana roli użytkownika
              </h3>
            </div>
            <div className="p-5">
              <p className="text-[14px] text-[#6b7280]">
                Zmienić rolę{' '}
                <span className="text-[#e6edf3] font-semibold">{userEmail}</span>
                {' '}z{' '}
                <span className="text-[#e6edf3] font-semibold">{ROLE_DISPLAY[currentRole]}</span>
                {' '}na{' '}
                <span className="text-[#e6edf3] font-semibold">{ROLE_DISPLAY[confirmData.newRole]}</span>?
              </p>
            </div>
            <div className="p-5 border-t border-[#2a2540] flex gap-2.5 justify-end">
              <button
                onClick={() => setConfirmData(null)}
                className="px-4 py-2 bg-[#2a2540] text-[#6b7280] rounded-lg text-[12px] hover:bg-[#3b3d7a] hover:text-[#e6edf3] transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={confirmChange}
                className="px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity"
              >
                Potwierdź
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

#### Krok 6 — `src/components/users/DeleteUserButton.tsx`

```typescript
// src/components/users/DeleteUserButton.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteUserButtonProps {
  userId: string;
  userEmail: string;
  disabled: boolean;
  onUserDeleted: () => void;
}

export function DeleteUserButton({ userId, userEmail, disabled, onUserDeleted }: DeleteUserButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? `Błąd usuwania użytkownika (${res.status}). Spróbuj ponownie.`);
        return;
      }

      toast.success(`Użytkownik ${userEmail} został usunięty`);
      onUserDeleted();  // odśwież tabelę
    } catch {
      toast.error('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Przycisk Usuń */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={disabled || isLoading}
        className={[
          'px-2.5 py-1 rounded-lg text-[12px] transition-colors',
          disabled || isLoading
            ? 'bg-[#2a2540] text-[#3d3757] cursor-not-allowed opacity-40'
            : 'bg-[#3a1a1a] text-[#f87171] hover:bg-[#4a2020] cursor-pointer',
        ].join(' ')}
        title={disabled ? 'Nie możesz modyfikować własnego konta' : 'Usuń użytkownika'}
        aria-label={`Usuń użytkownika ${userEmail}`}
      >
        {isLoading ? '...' : 'Usuń'}
      </button>

      {/* Modal potwierdzenia usunięcia */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          onClick={e => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-2xl w-[480px] max-w-[90vw] shadow-xl">
            <div className="p-5 border-b border-[#2a2540]">
              <h3 id="confirm-delete-title" className="text-[16px] font-bold text-[#e6edf3]">
                Usuń użytkownika
              </h3>
            </div>
            <div className="p-5">
              <p className="text-[14px] text-[#6b7280]">
                Czy na pewno chcesz usunąć użytkownika{' '}
                <span className="text-[#e6edf3] font-semibold">{userEmail}</span>?{' '}
                <span className="text-[#f87171]">Tej operacji nie można cofnąć.</span>
              </p>
            </div>
            <div className="p-5 border-t border-[#2a2540] flex gap-2.5 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-[#2a2540] text-[#6b7280] rounded-lg text-[12px] hover:bg-[#3b3d7a] hover:text-[#e6edf3] transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-[#f87171] hover:bg-[#ef4444] text-white rounded-lg text-[12px] font-semibold transition-colors"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

#### Krok 7 — `src/components/users/UserManagementPage.tsx`

```typescript
// src/components/users/UserManagementPage.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { InviteUserForm } from './InviteUserForm';
import { UsersTable } from './UsersTable';
import type { UserRow } from '@/types/users.types';

// AccessDenied — przeniesiony z page.tsx dla lepszej spójności Client Component
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-4xl" aria-hidden="true">🔒</div>
      <h2 className="text-[18px] font-bold text-[#e6edf3]">Brak dostępu</h2>
      <p className="text-[14px] text-[#6b7280]">Nie masz uprawnień do tej strony.</p>
      <a
        href="/home"
        className="px-4 py-2 bg-[#2a2540] text-[#e6edf3] rounded-lg text-[13px]
                   hover:bg-[#3b3d7a] transition-colors"
      >
        Wróć do strony głównej
      </a>
    </div>
  );
}

function UserManagementContent() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pobierz listę użytkowników z GET /api/users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFetchError(data.message ?? `Błąd ładowania użytkowników (${res.status})`);
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setFetchError('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pobierz użytkowników przy montowaniu
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="p-5 max-w-4xl">
      {/* Nagłówek strony */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#e6edf3]">Zarządzanie użytkownikami</h1>
        <p className="text-[13px] text-[#6b7280] mt-1">
          Zapraszaj nowych użytkowników i zarządzaj ich rolami w systemie.
        </p>
      </div>

      {/* Formularz zapraszania */}
      <InviteUserForm onInviteSuccess={fetchUsers} />

      {/* Tabela użytkowników */}
      <div className="bg-[#1a1730] border border-[#2a2540] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#e6edf3]">
            Użytkownicy
            {!isLoading && (
              <span className="ml-2 text-[12px] font-normal text-[#4b4569]">
                ({users.length})
              </span>
            )}
          </h2>
          {/* Przycisk odświeżenia listy */}
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="text-[12px] text-[#818cf8] hover:text-[#a78bfa] transition-colors disabled:opacity-40"
            aria-label="Odśwież listę użytkowników"
          >
            {isLoading ? 'Ładowanie...' : '↻ Odśwież'}
          </button>
        </div>

        {/* Stan ładowania */}
        {isLoading && (
          <div className="space-y-2.5 py-2" aria-busy="true" aria-label="Ładowanie użytkowników...">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-[#13111c] rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Stan błędu */}
        {!isLoading && fetchError && (
          <div className="py-4 text-center">
            <p className="text-[13px] text-[#f87171] mb-3">{fetchError}</p>
            <button
              onClick={fetchUsers}
              className="px-3 py-1.5 bg-[#2a2540] text-[#e6edf3] rounded-lg text-[12px] hover:bg-[#3b3d7a] transition-colors"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* Tabela — stan załadowany bez błędu */}
        {!isLoading && !fetchError && (
          <UsersTable
            users={users}
            onRoleChanged={fetchUsers}
            onUserDeleted={fetchUsers}
          />
        )}
      </div>
    </div>
  );
}

// Główny eksport — owinięty w PermissionGate
export function UserManagementPage() {
  return (
    <PermissionGate require="canManageUsers" fallback={<AccessDenied />}>
      <UserManagementContent />
    </PermissionGate>
  );
}
```

#### Krok 8 — Typ `UserRow` — `src/types/users.types.ts`

```typescript
// src/types/users.types.ts
import type { Role } from './auth.types';

export interface UserRow {
  id: string;         // UUID — Supabase auth user id
  email: string;      // adres email
  role: Role;         // 'ADMIN' | 'HELPER_PLUS' | 'HELPER'
  created_at: string; // ISO 8601 string: "2026-02-19T10:00:00Z"
}
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `UserManagementPage` | Strona wrapper | brak | loading (skeleton), error (fetch error + retry), filled (tabela + form) |
| `InviteUserForm` | Formularz | `onInviteSuccess: () => void` | idle, loading (submitting), validation error per pole |
| `UsersTable` | Tabela | `users[]`, `onRoleChanged`, `onUserDeleted` | filled (z danymi), empty (brak innych userów) |
| `RoleBadge` | Badge | `role: Role` | 3 kolory: fioletowy / niebieski / szary |
| `ChangeRoleDropdown` | Select + modal | `userId`, `userEmail`, `currentRole`, `disabled`, `onRoleChanged` | normal, disabled (own account), loading (PATCH in progress), confirm modal open |
| `DeleteUserButton` | Button + modal | `userId`, `userEmail`, `disabled`, `onUserDeleted` | normal, disabled (own account), loading (DELETE in progress), confirm modal open |

### Pola formularza InviteUserForm

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| Email | email input | niepuste + format email | "Adres email jest wymagany" / "Nieprawidłowy format adresu email" | tak |
| Rola | select | niepuste (wybrana opcja) | "Rola jest wymagana" | tak |

### Stany widoku strony

**Loading (fetchUsers in progress):**
- Tabela zastąpiona 3 skeleton rows (h-10, animate-pulse, bg-[#13111c])
- Przycisk "↻ Odśwież" disabled, tekst zmieniony na "Ładowanie..."
- Formularz InviteUserForm jest widoczny i AKTYWNY podczas ładowania tabeli

**Empty (brak innych użytkowników):**
- Tabela pokazuje 1 wiersz (własne konto ADMIN z zablokowanymi akcjami)
- Pod tabelą widoczny komunikat: "Nie ma jeszcze innych użytkowników. Zaproś kogoś powyżej!"
- Formularz InviteUserForm jest widoczny i aktywny

**Error (GET /api/users failed):**
- Zamiast tabeli: komunikat błędu (czerwony tekst) + przycisk "Spróbuj ponownie"
- Formularz InviteUserForm pozostaje widoczny (można zapraszać nawet gdy lista nie załadowana)

**Filled (normalny stan):**
- Formularz InviteUserForm na górze
- Tabela z listą użytkowników: Email + kolorowy RoleBadge + data + akcje (ChangeRoleDropdown + DeleteUserButton)
- Własne konto ADMIN: akcje zablokowane (disabled)

**403 Fallback (non-ADMIN):**
- PermissionGate renderuje `<AccessDenied />` — ikona 🔒, tekst "Brak dostępu", link "Wróć do strony głównej"
- Tabela i formularz NIE są renderowane

### Flow interakcji (krok po kroku)

```
1. ADMIN nawiguje do /settings/users → page.tsx renderuje UserManagementPage
2. UserManagementPage: PermissionGate sprawdza canManageUsers
   - jeśli false → renderuje AccessDenied, STOP
   - jeśli true → renderuje UserManagementContent
3. UserManagementContent useEffect → fetchUsers() → isLoading=true
4. UI: InviteUserForm widoczny + tabela w stanie skeleton (3 pulse rows)
5. GET /api/users odpowiada 200 → setUsers(data.users) → isLoading=false
6. UI: tabela wyświetla użytkowników, skeleton znika

--- INVITE FLOW ---
7. ADMIN wpisuje email → onChange czyści emailError
8. ADMIN opuszcza pole email → onBlur → walidacja → ewentualny błąd przy polu
9. ADMIN wybiera rolę z select
10. ADMIN klika "Zaproś" → handleSubmit() → validateEmail() + validateRole()
    - błędy → wyświetl przy polach, STOP
    - OK → POST /api/users/invite → isLoading=true → przycisk disabled "Zapraszanie..."
11. Odpowiedź 200 → toast sukces + wyczyść formularz + fetchUsers() (odśwież tabelę)
    Odpowiedź 409 → emailError = "Użytkownik ... już istnieje" + isLoading=false
    Odpowiedź inny błąd → toast.error + isLoading=false

--- CHANGE ROLE FLOW ---
12. ADMIN wybiera nową rolę z ChangeRoleDropdown → handleRoleChange(newRole)
    - newRole === currentRole → nic się nie dzieje, STOP
    - newRole !== currentRole → setConfirmData({ newRole }) → modal pojawia się
13. Modal: "Zmienić rolę X z Y na Z?"
    - Anuluj → setConfirmData(null) → modal znika, dropdown wraca do currentRole
    - Potwierdź → confirmChange() → PATCH /api/users/[id]/role
14. PATCH 200 → toast sukces + onRoleChanged() → fetchUsers() → tabela odświeżona
    PATCH błąd → toast.error + isLoading=false

--- DELETE FLOW ---
15. ADMIN klika "Usuń" → setShowConfirm(true) → modal pojawia się
16. Modal: "Czy na pewno chcesz usunąć X? Tej operacji nie można cofnąć."
    - Anuluj → setShowConfirm(false) → modal znika
    - Usuń (czerwony) → handleDelete() → DELETE /api/users/[id]
17. DELETE 200 → toast sukces + onUserDeleted() → fetchUsers() → wiersz znika
    DELETE błąd → toast.error

--- KEYBOARD FLOW (modals) ---
18. Użytkownik naciska Escape → modal zamyka się (dodaj useEffect z keydown listener)
19. Kliknięcie tła modalu → modal zamyka się (onClick na overlay)
20. Tab w modalu → focus przechodzi między przyciskami (Anuluj → Potwierdź/Usuń)
```

### Responsive / Dostępność
- Mobile (375px+): formularz invite składa się do `flex-col` (Email, Role, button jeden pod drugim)
- Tablet (768px+): formularz w rzędzie `flex-row flex-wrap`, tabela może wymagać horizontal scroll
- Desktop (1280px+): docelowy layout — formularz w jednym rzędzie, tabela bez scrollu
- Keyboard navigation: Tab przez pola formularza i przyciski; Enter submituje formularz; Escape zamyka modals; Tab w modal przechodzi tylko między przyciskami modala (focus trap — opcjonalne)
- ARIA:
  - Tabela: `role="table"`, `aria-label="Lista użytkowników"`
  - Skeleton loading: `aria-busy="true"`, `aria-label="Ładowanie..."`
  - Zablokowane przyciski: `title="Nie możesz modyfikować własnego konta"` + `disabled`
  - Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` z ID nagłówka
  - Toast error: automatycznie przez `sonner` bibliotekę
  - Select roli: `aria-label="Zmień rolę [email]"` na ChangeRoleDropdown
  - Komunikaty błędów: `role="alert"` na spanach z błędami + `aria-describedby` na inputach

---

## ⚠️ Edge Cases

### EC-1: ADMIN próbuje usunąć samego siebie przez wpisanie URL DELETE bezpośrednio
Scenariusz: ADMIN minął UI i wysłał bezpośrednio DELETE /api/users/[własne-uuid]. Frontend blokuje przycisk "Usuń" na własnym koncie (disabled), ale ktoś mógłby wywołać API bezpośrednio.
Oczekiwane zachowanie FRONTEND: Przycisk "Usuń" i dropdown "Zmień rolę" dla własnego konta są zawsze `disabled`. Tooltip: "Nie możesz modyfikować własnego konta". BACKEND (STORY-3.4) odpowiada 403. Nawet jeśli ktoś wyśle DELETE bezpośrednio — API go zablokuje.

### EC-2: Dwa taby ADMIN — jeden usuwa usera, drugi próbuje mu zmienić rolę
Scenariusz: ADMIN ma otwarte dwa taby `/settings/users`. Tab A usuwa Angelikę. Tab B nadal pokazuje Angelikę w tabeli i klika "Zmień rolę".
Oczekiwane zachowanie: Tab B wysyła PATCH /api/users/[id-angeliki]/role → API zwraca 404 (user nie istnieje). Frontend wyświetla toast.error: "Błąd zmiany roli (404). Spróbuj ponownie." oraz odświeża tabelę (fetchUsers()) — Angelika znika.

### EC-3: Formularz invite — email już zaproszony (409 Conflict)
Scenariusz: ADMIN zaprasza "angelika@rodzina.pl" która już ma konto.
Oczekiwane zachowanie: API zwraca 409. Frontend: `setEmailError("Użytkownik angelika@rodzina.pl już istnieje w systemie")` — błąd pojawia się przy polu Email (inline, czerwony tekst). Toast NIE jest wyświetlany (błąd jest inline). Przycisk "Zaproś" odblokowuje się (isLoading=false).

### EC-4: GET /api/users zwraca pusty array (tylko ADMIN w systemie)
Scenariusz: System ma tylko 1 użytkownika — Mariusz (ADMIN). GET /api/users zwraca `{ users: [{ id: "uuid-admin", email: "mariusz@rodzina.pl", role: "ADMIN", created_at: "..." }] }`.
Oczekiwane zachowanie: Tabela wyświetla 1 wiersz (Mariusz) z zablokowanymi akcjami. `otherUsers.length === 0` → wyświetla się empty state komunikat: "Nie ma jeszcze innych użytkowników. Zaproś kogoś powyżej!" Formularz invite jest aktywny.

### EC-5: Błąd sieci podczas DELETE — UI i tabela w niespójnym stanie
Scenariusz: ADMIN klika "Usuń", potwierdza, fetch rzuca `TypeError: Failed to fetch` (brak internetu).
Oczekiwane zachowanie: `catch` w `handleDelete()` → `toast.error("Błąd sieci. Sprawdź połączenie i spróbuj ponownie.")`. Wiersz użytkownika pozostaje w tabeli (nie jest usuwany optymistycznie). `isLoading=false` → przycisk "Usuń" odblokowuje się. Tabela NIE jest odświeżana (bo błąd sieci — fetchUsers() też by się nie powiódł).

### EC-6: Bardzo długa lista użytkowników (100+ rekordów)
Scenariusz: Tabela ma 100+ wierszy — mało prawdopodobne w projekcie rodzinnym, ale możliwe przy testach.
Oczekiwane zachowanie: Tabela renderuje wszystkie wiersze — brak paginacji (out of scope dla projektu rodzinnego). Kontener tabeli ma `overflow-x-auto` dla horizontal scroll na małych ekranach. Pionowy scroll całej strony obsługuje nadmiar treści. Brak optymalizacji wirtualizacji (nie potrzebna przy <20 userów rodzinnych).

### EC-7: Zmiana roli ADMIN na inną — własne konto zablokowane
Scenariusz: Mariusz jest jedynym ADMIN i próbuje zmienić rolę swojego konta.
Oczekiwane zachowanie: Dropdown "Zmień rolę" jest `disabled` dla własnego konta (AC-7). Mariusz nie może przez UI zmienić własnej roli. To celowe — chroni przed przypadkowym pozbyciem się dostępu ADMIN.

---

## 🚫 Out of Scope tej Story
- Paginacja tabeli użytkowników (rodzina = max ~10 osób)
- Wyszukiwanie/filtrowanie użytkowników w tabeli
- Sortowanie kolumn tabeli
- Edycja emaila użytkownika (tylko rola jest edytowalna)
- Self-registration — strona invite jest jedyną drogą dodania usera
- Historia zmian ról (audit log)
- Bulk actions (np. usuń wielu userów naraz)
- Avatar/zdjęcie profilowe użytkownika
- Dezaktywacja konta (soft delete) — implementowana jest tylko hard delete przez DELETE endpoint
- Eksport listy użytkowników do CSV
- Focus trap w modalach (dostępność zaawansowana — nice to have)

---

## ✔️ Definition of Done
- [ ] Plik `src/app/(dashboard)/settings/users/page.tsx` istnieje i renderuje `UserManagementPage`
- [ ] Plik `src/types/users.types.ts` z typem `UserRow` (id, email, role, created_at)
- [ ] `UserManagementPage` owinięty w `<PermissionGate require="canManageUsers">` — non-ADMIN widzi AccessDenied
- [ ] `AccessDenied` komponent z tekstem "Nie masz uprawnień do tej strony." i linkiem "/home"
- [ ] `GET /api/users` wywoływany przy montowaniu — stan loading → skeleton → tabela
- [ ] Tabela (`UsersTable`) wyświetla kolumny: Email, Rola (badge), Data dodania, Akcje
- [ ] `RoleBadge` ma 3 kolory: ADMIN=fioletowy (`bg-[#2d1b4a] text-[#a78bfa]`), HELPER+=niebieski (`bg-[#1a3a5c] text-[#60a5fa]`), HELPER=szary (`bg-[#2a2540] text-[#9ca3af]`)
- [ ] `formatDate` formatuje ISO string do polskiej daty (np. "15 sty 2026")
- [ ] Własne konto ADMIN: ChangeRoleDropdown i DeleteUserButton są `disabled` z title "Nie możesz modyfikować własnego konta"
- [ ] `InviteUserForm`: walidacja email (wymagane + format) i rola (wymagana) — inline błędy przy polach
- [ ] `InviteUserForm`: submit wysyła `POST /api/users/invite` — loading state przycisku → toast sukces/błąd → reset formularza → refetch tabeli
- [ ] `InviteUserForm`: 409 od API → inline błąd przy polu email (nie toast)
- [ ] `ChangeRoleDropdown`: wybór nowej roli otwiera modal potwierdzenia z "Potwierdź"/"Anuluj"
- [ ] `ChangeRoleDropdown`: PATCH 200 → toast sukces → refetch tabeli; błąd → toast.error
- [ ] `DeleteUserButton`: kliknięcie otwiera modal z czerwonym przyciskiem "Usuń" i "Anuluj"
- [ ] `DeleteUserButton`: DELETE 200 → toast sukces → wiersz znika (refetch); błąd → toast.error
- [ ] Modals zamykają się na Escape i kliknięcie tła (onClick na overlay)
- [ ] Stan error tabeli (fetchUsers fails): komunikat błędu + przycisk "Spróbuj ponownie"
- [ ] Empty state: komunikat "Nie ma jeszcze innych użytkowników. Zaproś kogoś powyżej!" gdy brak innych userów
- [ ] Wszystkie 4 stany widoku zaimplementowane: loading (skeleton), empty, error (z retry), filled
- [ ] Formularz działa na mobile 375px (flex-col) bez horizontal scroll
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Brak `any` — TypeScript strict mode, Role z `@/types/auth.types.ts`, UserRow z `@/types/users.types.ts`
- [ ] Komunikaty błędów i toasty po polsku
- [ ] ARIA: `role="table"`, `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-invalid`, `aria-describedby`, `aria-busy`
- [ ] Kod przechodzi linter bez błędów (`next lint`)
- [ ] Story review przez PO
