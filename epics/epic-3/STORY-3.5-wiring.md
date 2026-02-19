---
story_id: STORY-3.5
title: "Auth context + hooki roli udostępniają dane sesji całej aplikacji"
epic: EPIC-3
module: auth
domain: wiring
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: none
api_reference: none
priority: must
estimated_effort: 5h
depends_on: STORY-3.1, STORY-3.2
blocks: STORY-3.6, STORY-3.7, STORY-3.8
tags: [context, hooks, rbac, permissions, typescript, supabase-auth]
---

## 🎯 User Story

**Jako** deweloper implementujący komponenty Kira Dashboard
**Chcę** mieć dostęp do obiektu usera, jego roli i listy uprawnień przez dedykowane hooki (`useUser()`, `usePermissions()`)
**Żeby** każdy komponent w aplikacji mógł bezpiecznie sprawdzić "kto jest zalogowany i co może zrobić" bez pisania własnych zapytań do Supabase

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Trzy nowe pliki:
1. `src/types/auth.types.ts` — typy TypeScript (Role, Permission, User, etc.)
2. `src/contexts/RoleContext.tsx` — RoleProvider + wewnętrzna logika fetchowania
3. `src/components/auth/PermissionGate.tsx` — komponent warunkowego renderowania

Modyfikacja istniejącego pliku:
- `src/app/layout.tsx` (lub `src/app/providers.tsx`) — owinięcie aplikacji w `<RoleProvider>`

### Powiązane pliki
- `src/lib/supabase/client.ts` — `createClient()` dla przeglądarki; używany w `RoleContext.tsx` do `auth.getUser()` i query `user_roles`
- `src/app/providers.tsx` — istniejący plik z `QueryClientProvider` i `Toaster`; RoleProvider musi być dodany WEWNĄTRZ tego pliku lub jako wrapper wokół

### Stan systemu przed tą story
- **STORY-3.1 DONE**: tabela `user_roles` z kolumnami `user_id UUID`, `role TEXT`
- **STORY-3.2 DONE**: Supabase Auth skonfigurowany; zalogowany user ma ważną sesję (cookie SSR)
- `src/lib/supabase/client.ts` istnieje z funkcją `createClient()` (browser client, ANON KEY)
- Zalogowany user ma rekord w tabeli `user_roles`

---

## ✅ Acceptance Criteria

### AC-1: RoleProvider opakowuje całą aplikację i udostępnia dane
GIVEN: Aplikacja jest uruchomiona
WHEN: Jakikolwiek komponent w drzewie React wywołuje `useUser()` lub `usePermissions()`
THEN: Komponent ma dostęp do aktualnej sesji — nie musi sam wywoływać `supabase.auth.getUser()`
AND: Jeśli sesja trwa i user jest zalogowany — `useUser()` zwraca `{ user: User, role: Role, isLoading: false }`
AND: Jeśli nikt nie jest zalogowany — `useUser()` zwraca `{ user: null, role: null, isLoading: false }`

### AC-2: Hook useUser() zwraca poprawnie otypowane dane usera i rolę
GIVEN: User `mariusz@rodzina.pl` jest zalogowany (sesja Supabase aktywna)
AND: W tabeli `user_roles` istnieje rekord `{ user_id: "uuid-mariusza", role: "ADMIN" }`
WHEN: Komponent wywołuje `const { user, role, isLoading } = useUser()`
THEN: `user` jest obiektem zgodnym z typem `User` (id, email)
AND: `role` jest wartością `"ADMIN"` (string literał z type `Role`)
AND: `isLoading` jest `false` po zakończeniu fetchowania

### AC-3: Hook useUser() zwraca isLoading: true podczas inicjalizacji
GIVEN: Aplikacja właśnie się załadowała (sesja Supabase nie jest jeszcze znana)
WHEN: Komponent wywołuje `useUser()` w pierwszym renderze
THEN: `isLoading` jest `true`
AND: `user` jest `null`
AND: `role` jest `null`
AND: Gdy Supabase odpowie — RoleProvider aktualizuje stan i `isLoading` staje się `false`

### AC-4: Hook usePermissions() zwraca poprawne uprawnienia dla każdej roli
GIVEN: User jest zalogowany z rolą `ADMIN`
WHEN: Komponent wywołuje `const permissions = usePermissions()`
THEN: `permissions.canAccessDashboard === true`
AND: `permissions.canAccessHome === true`
AND: `permissions.canAccessAnalytics === true`
AND: `permissions.canManageUsers === true`
AND: `permissions.canStartStory === true`

GIVEN: User jest zalogowany z rolą `HELPER_PLUS`
WHEN: Komponent wywołuje `usePermissions()`
THEN: `permissions.canAccessDashboard === false`
AND: `permissions.canAccessHome === true`
AND: `permissions.canAccessAnalytics === true`
AND: `permissions.canManageUsers === false`
AND: `permissions.canStartStory === true`

GIVEN: User jest zalogowany z rolą `HELPER`
WHEN: Komponent wywołuje `usePermissions()`
THEN: `permissions.canAccessDashboard === false`
AND: `permissions.canAccessHome === true`
AND: `permissions.canAccessAnalytics === false`
AND: `permissions.canManageUsers === false`
AND: `permissions.canStartStory === false`

GIVEN: Nikt nie jest zalogowany (user === null, role === null)
WHEN: Komponent wywołuje `usePermissions()`
THEN: Wszystkie permissions są `false`

### AC-5: PermissionGate renderuje children tylko gdy uprawnienie jest spełnione
GIVEN: User jest zalogowany z rolą `ADMIN` (canManageUsers === true)
WHEN: W JSX używamy `<PermissionGate require="canManageUsers"><AdminButton /></PermissionGate>`
THEN: `<AdminButton />` jest renderowany w DOM

GIVEN: User jest zalogowany z rolą `HELPER` (canManageUsers === false)
WHEN: W JSX używamy `<PermissionGate require="canManageUsers"><AdminButton /></PermissionGate>`
THEN: `<AdminButton />` NIE jest renderowany (zwracane `null`)

### AC-6: PermissionGate obsługuje prop fallback
GIVEN: User z rolą `HELPER` (canManageUsers === false)
WHEN: W JSX używamy `<PermissionGate require="canManageUsers" fallback={<p>Brak dostępu</p>}><AdminButton /></PermissionGate>`
THEN: Renderowane jest `<p>Brak dostępu</p>` zamiast `null`
AND: `<AdminButton />` NIE jest renderowany

### AC-7: Wywołanie hooków poza RoleProvider rzuca czytelny błąd
GIVEN: Komponent jest renderowany poza drzewem `<RoleProvider>`
WHEN: Komponent wywołuje `useUser()` lub `usePermissions()`
THEN: React rzuca Error z komunikatem: `"useUser must be used within a RoleProvider"`

---

## 🔌 Szczegóły Wiring

### Krok 1 — Typy w `src/types/auth.types.ts`

```typescript
// src/types/auth.types.ts

// Dozwolone role w systemie
export type Role = 'ADMIN' | 'HELPER_PLUS' | 'HELPER';

// Uprawnienia dostępne w aplikacji
export interface Permission {
  canAccessDashboard: boolean   // true tylko dla ADMIN
  canAccessHome: boolean        // true dla ADMIN, HELPER_PLUS, HELPER
  canAccessAnalytics: boolean   // true dla ADMIN i HELPER_PLUS
  canManageUsers: boolean       // true tylko dla ADMIN
  canStartStory: boolean        // true dla ADMIN i HELPER_PLUS
}

// Uproszczony User (podzbiór Supabase User)
export interface User {
  id: string       // UUID — ten sam co auth.user.id
  email: string    // adres email z Supabase Auth
}

// Kształt kontekstu udostępnianego przez RoleProvider
export interface RoleContextValue {
  user: User | null
  role: Role | null
  isLoading: boolean
}
```

### Krok 2 — Mapa uprawnień

Zdefiniuj stałą `ROLE_PERMISSIONS` jako mapę `Role → Permission`. Umieść ją w `src/contexts/RoleContext.tsx` lub w osobnym pliku `src/lib/auth/permissions.ts`.

```typescript
// Pełna tabela uprawnień per rola
const ROLE_PERMISSIONS: Record<Role, Permission> = {
  ADMIN: {
    canAccessDashboard: true,
    canAccessHome: true,
    canAccessAnalytics: true,
    canManageUsers: true,
    canStartStory: true,
  },
  HELPER_PLUS: {
    canAccessDashboard: false,
    canAccessHome: true,
    canAccessAnalytics: true,
    canManageUsers: false,
    canStartStory: true,
  },
  HELPER: {
    canAccessDashboard: false,
    canAccessHome: true,
    canAccessAnalytics: false,
    canManageUsers: false,
    canStartStory: false,
  },
};

// Uprawnienia dla niezalogowanego usera (role === null)
const NO_PERMISSIONS: Permission = {
  canAccessDashboard: false,
  canAccessHome: false,
  canAccessAnalytics: false,
  canManageUsers: false,
  canStartStory: false,
};
```

### Krok 3 — `src/contexts/RoleContext.tsx` — pełna implementacja

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Role, User, RoleContextValue } from '@/types/auth.types';

// Tworzymy context z wartością domyślną undefined (celowo — wykrywamy użycie poza Provider)
const RoleContext = createContext<RoleContextValue | undefined>(undefined);

interface RoleProviderProps {
  children: React.ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Funkcja ładująca dane usera i jego rolę
    async function loadUserAndRole() {
      setIsLoading(true);
      try {
        // 1. Pobierz aktualną sesję z Supabase Auth
        const { data: { user: supabaseUser }, error: authError } = 
          await supabase.auth.getUser();

        if (authError || !supabaseUser) {
          // Brak sesji — użytkownik niezalogowany
          setUser(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        // 2. Ustaw podstawowe dane usera
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email ?? '',
        });

        // 3. Pobierz rolę z tabeli user_roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUser.id)
          .single();

        if (roleError || !roleData) {
          // User zalogowany ale bez roli — traktuj jako brak dostępu
          console.warn('RoleProvider: user has no role in user_roles table');
          setRole(null);
        } else {
          setRole(roleData.role as Role);
        }
      } catch (err) {
        console.error('RoleProvider: unexpected error loading user', err);
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    // Załaduj dane przy montowaniu
    loadUserAndRole();

    // Subskrybuj zmiany sesji (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setRole(null);
          setIsLoading(false);
          return;
        }
        // SIGNED_IN lub TOKEN_REFRESHED — przeładuj dane
        await loadUserAndRole();
      }
    );

    // Cleanup subskrypcji przy odmontowaniu
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: RoleContextValue = { user, role, isLoading };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

// Hook useUser — export
export function useUser(): RoleContextValue {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a RoleProvider');
  }
  return context;
}
```

### Krok 4 — Hook `usePermissions()` w `src/contexts/RoleContext.tsx` (dodaj do tego samego pliku)

```typescript
// Importuj typy na górze pliku (jeśli jeszcze nie zaimportowane):
// import type { Permission } from '@/types/auth.types';
// import { ROLE_PERMISSIONS, NO_PERMISSIONS } from '@/lib/auth/permissions';

export function usePermissions(): Permission {
  const { role } = useUser();  // rzuci błąd jeśli poza RoleProvider — poprawne zachowanie
  
  if (!role) {
    return NO_PERMISSIONS;
  }
  
  return ROLE_PERMISSIONS[role];
}
```

### Krok 5 — `src/components/auth/PermissionGate.tsx`

```typescript
// src/components/auth/PermissionGate.tsx
'use client';

import React from 'react';
import { usePermissions } from '@/contexts/RoleContext';
import type { Permission } from '@/types/auth.types';

interface PermissionGateProps {
  require: keyof Permission         // klucz z interfejsu Permission (np. "canManageUsers")
  children: React.ReactNode         // co renderować gdy uprawnienie spełnione
  fallback?: React.ReactNode        // co renderować gdy brak uprawnienia (domyślnie null)
}

export function PermissionGate({ require: permission, children, fallback = null }: PermissionGateProps) {
  const permissions = usePermissions();
  
  if (!permissions[permission]) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
```

### Krok 6 — Podpięcie RoleProvider w `src/app/providers.tsx`

Otwórz istniejący plik `src/app/providers.tsx` i dodaj `RoleProvider`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { RoleProvider } from '@/contexts/RoleContext';  // ← DODAJ

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>              {/* ← DODAJ — owijamy całą aplikację */}
        {children}
        <Toaster richColors position="top-right" />
      </RoleProvider>             {/* ← DODAJ */}
    </QueryClientProvider>
  );
}
```

**UWAGA**: `RoleProvider` musi być `'use client'` i musi być WEWNĄTRZ `QueryClientProvider` (lub równolegle). NIE może być w Server Component.

### Eksporty — co powinno być dostępne z zewnątrz

```typescript
// Z src/contexts/RoleContext.tsx — eksportuj:
export { RoleProvider, useUser, usePermissions }

// Z src/types/auth.types.ts — eksportuj:
export type { Role, Permission, User, RoleContextValue }

// Z src/components/auth/PermissionGate.tsx — eksportuj:
export { PermissionGate }

// Opcjonalnie barrel export z src/lib/auth/index.ts:
export { RoleProvider, useUser, usePermissions } from '@/contexts/RoleContext';
export { PermissionGate } from '@/components/auth/PermissionGate';
export type { Role, Permission, User } from '@/types/auth.types';
```

### Obsługa błędów

```typescript
// Błędy do obsłużenia w RoleProvider.loadUserAndRole():
// - supabase.auth.getUser() network error → setUser(null), setRole(null)
// - user_roles query error (DB offline) → setRole(null), console.warn
// - user_roles zwraca rolę spoza ['ADMIN','HELPER_PLUS','HELPER'] → setRole(null), console.error

// NIE rzucaj błędów do góry — RoleProvider nie może crashować aplikację
// Loguj do console.error w dev, w prod możesz dodać Sentry/monitoring
```

---

## ⚠️ Edge Cases

### EC-1: User zalogowany ale bez rekordu w user_roles
Scenariusz: Ktoś jest w Supabase Auth (np. po nieudanym invite flow) ale nie ma roli w `user_roles`
Oczekiwane zachowanie: `useUser()` zwraca `{ user: User, role: null, isLoading: false }`. `usePermissions()` zwraca `NO_PERMISSIONS`. RBAC middleware (STORY-3.3) przekieruje go do `/login`.

### EC-2: Równoczesna sesja w kilku zakładkach — logout w jednej
Scenariusz: User wylogowuje się w zakładce A. Zakładka B ma aktywny RoleProvider.
Oczekiwane zachowanie: `supabase.auth.onAuthStateChange` w zakładce B emituje zdarzenie `SIGNED_OUT`. RoleProvider automatycznie ustawia `user = null, role = null`. Komponenty które zależą od `useUser()` re-renderują się i widok odświeża się.

### EC-3: Token refresh w tle
Scenariusz: Supabase automatycznie odświeża token JWT (przed wygaśnięciem)
Oczekiwane zachowanie: `onAuthStateChange` emituje `TOKEN_REFRESHED`. `loadUserAndRole()` jest wywołana ponownie. `user` i `role` pozostają te same (nie migają do null i z powrotem) bo settery są wywoływane z tymi samymi wartościami.

### EC-4: Wywołanie useUser() podczas isLoading
Scenariusz: Komponent renderuje się zanim Supabase odpowiedział na `getUser()`
Oczekiwane zachowanie: `isLoading === true`, `user === null`, `role === null`. Komponent powinien renderować loading state (np. skeleton) zamiast treści chronionej. **NIE** sprawdzaj `role === null` jako substytut `isLoading` — użyj `isLoading` explicite.

### EC-5: Rola w user_roles zmieniona przez ADMIN (STORY-3.4) gdy user jest zalogowany
Scenariusz: ADMIN zmienia rolę Angeliki z HELPER_PLUS na HELPER przez API. Angelika ma aktywną sesję.
Oczekiwane zachowanie: W tej story NIE implementujemy real-time roli. Zmiana roli będzie widoczna po następnym odświeżeniu sesji (np. przeładowanie strony lub następny login). Jeśli potrzebne real-time — osobna story z Supabase Realtime subscription.

---

## 🚫 Out of Scope tej Story
- Real-time aktualizacja roli bez przeładowania strony (wymaga Supabase Realtime)
- Persistowanie roli w localStorage (sesja Supabase jest wystarczająca)
- Logika redirect po autoryzacji (to jest STORY-3.3 middleware + STORY-3.6 login page)
- Server-side sprawdzanie roli w komponentach (Server Components czytają rolę inaczej — przez cookies/JWT)
- `useUser()` dla Server Components — ten hook jest client-only

---

## ✔️ Definition of Done
- [ ] Plik `src/types/auth.types.ts` z typami `Role`, `Permission`, `User`, `RoleContextValue`
- [ ] Brak `any` — wszystko otypowane (TypeScript strict mode)
- [ ] `RoleProvider` opakowuje aplikację w `src/app/providers.tsx`
- [ ] `useUser()` zwraca `{user, role, isLoading}` — działa po zalogowaniu (role != null) i po wylogowaniu (user = null)
- [ ] `usePermissions()` zwraca poprawną macierz uprawnień dla każdej z 3 ról
- [ ] `usePermissions()` zwraca `NO_PERMISSIONS` gdy `role === null`
- [ ] `PermissionGate` renderuje children gdy uprawnienie = true, null lub fallback gdy false
- [ ] Wywołanie `useUser()` poza RoleProvider rzuca czytelny Error
- [ ] `onAuthStateChange` subskrypcja cancelowana przy unmount (cleanup w useEffect)
- [ ] `loadUserAndRole` nie rzuca uncaught error — wszystkie błędy obsłużone gracefully
- [ ] Kod przechodzi linter bez błędów (`next lint`)
- [ ] Story review przez PO
