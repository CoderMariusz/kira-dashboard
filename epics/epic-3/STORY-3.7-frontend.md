---
story_id: STORY-3.7
title: "Sidebar adaptuje sekcje nawigacji do roli zalogowanego użytkownika"
epic: EPIC-3
module: auth
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: /Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html
api_reference: none
priority: must
estimated_effort: 8h
depends_on: STORY-1.8, STORY-3.5
blocks: STORY-3.8
tags: [sidebar, navigation, rbac, conditional-rendering, skeleton, useUser, PermissionGate]
---

## 🎯 User Story

**Jako** zalogowany użytkownik Kira Dashboard (ADMIN, HELPER_PLUS lub HELPER)
**Chcę** widzieć w sidebarze tylko te sekcje nawigacji, do których mam uprawnienia wynikające z mojej roli
**Żeby** nie widzieć linków do stron, do których nie mam dostępu, i nie czuć się zagubionym w interfejsie

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: wszystkie trasy za layoutem `src/app/(dashboard)/layout.tsx`
Główny komponent do modyfikacji: `src/components/layout/Sidebar.tsx` (stworzony w STORY-1.8)
Nowe pliki do stworzenia:
- `src/components/layout/NavSection.tsx` — komponent sekcji nawigacji
- `src/components/layout/NavItem.tsx` — komponent pojedynczego linku
- `src/components/layout/NavConfig.ts` — konfiguracja struktury nawigacji
- `src/components/layout/UserPill.tsx` — user pill na dole sidebara
- `src/components/layout/SidebarSkeleton.tsx` — skeleton ładowania sidebara

### Powiązane pliki
- `src/contexts/RoleContext.tsx` — hook `useUser()` i `usePermissions()` (STORY-3.5)
- `src/types/auth.types.ts` — typy `Role`, `Permission` (STORY-3.5)
- `src/components/auth/PermissionGate.tsx` — komponent warunkowego renderowania (STORY-3.5)
- `src/components/layout/Sidebar.tsx` — istniejący sidebar z STORY-1.8 (do rozbudowy)
- `src/app/(dashboard)/layout.tsx` — layout który renderuje Sidebar

### Stan systemu przed tą story
- **STORY-1.8 DONE**: `Sidebar.tsx` istnieje i renderuje się w `(dashboard)/layout.tsx`. Sidebar ma `IconRail` (56px) i `TextNav` (160px) ze statyczną nawigacją: Overview, Pipeline, Eval, Patterns, Health.
- **STORY-3.5 DONE**: Istnieją:
  - `useUser()` zwraca `{ user, role, isLoading }` — użycie: `const { user, role, isLoading } = useUser()`
  - `usePermissions()` zwraca obiekt `Permission` — np. `{ canAccessDashboard: true, canManageUsers: false }`
  - `PermissionGate` komponent z propami `require: keyof Permission` i `fallback?`
  - Typy: `Role = 'ADMIN' | 'HELPER_PLUS' | 'HELPER'` i `Permission` interfejs
- Zalogowany user ma ważną sesję Supabase; `useUser()` zwraca dane bez dodatkowych zapytań

### Mapa widoczności nawigacji per rola

| Sekcja | Element | ADMIN | HELPER_PLUS | HELPER |
|--------|---------|-------|-------------|--------|
| Pipeline | Overview | ✅ | ❌ | ❌ |
| Pipeline | Models | ✅ | ❌ | ❌ |
| Pipeline | Pipeline | ✅ | ❌ | ❌ |
| Pipeline | Eval | ✅ | ❌ | ❌ |
| Pipeline | Patterns | ✅ | ❌ | ❌ |
| Pipeline | Health | ✅ | ❌ | ❌ |
| Home | Home Overview | ✅ | ✅ | ❌ |
| Home | Shopping | ✅ | ✅ | ✅ |
| Home | Tasks | ✅ | ✅ | ✅ |
| Home | Activity | ✅ | ✅ | ❌ |
| Home | Analytics | ✅ | ✅ | ❌ |
| Settings | Users | ✅ | ❌ | ❌ |
| Settings | System | ✅ | ❌ | ❌ |

Skrót per rola:
- **ADMIN**: Sekcja "Pipeline" (6 elementów) + Sekcja "Home" (5 elementów) + Sekcja "Settings" (2 elementy)
- **HELPER_PLUS**: Sekcja "Home" (5 elementów: wszystkie)
- **HELPER**: Sekcja "Home" tylko 2 elementy: Tasks + Shopping

---

## ✅ Acceptance Criteria

### AC-1: ADMIN widzi kompletny sidebar (Pipeline + Home + Settings)
GIVEN: Użytkownik `mariusz@rodzina.pl` jest zalogowany z rolą `ADMIN`
AND: `useUser()` zwraca `{ user: { id: "uuid-admin", email: "mariusz@rodzina.pl" }, role: "ADMIN", isLoading: false }`
WHEN: Użytkownik patrzy na sidebar aplikacji
THEN: Sidebar wyświetla sekcję "Pipeline" z 6 linkami w tej kolejności: Overview, Models, Pipeline, Eval, Patterns, Health
AND: Sidebar wyświetla sekcję "Home" z 5 linkami w tej kolejności: Home Overview, Shopping, Tasks, Activity, Analytics
AND: Sidebar wyświetla sekcję "Settings" z 2 linkami w tej kolejności: Users, System
AND: Łącznie widoczne są 3 sekcje i 13 linków nawigacyjnych

### AC-2: HELPER_PLUS widzi tylko sekcję Home z pełną listą
GIVEN: Użytkownik `angelika@rodzina.pl` jest zalogowany z rolą `HELPER_PLUS`
AND: `useUser()` zwraca `{ user: { id: "uuid-angelika", email: "angelika@rodzina.pl" }, role: "HELPER_PLUS", isLoading: false }`
WHEN: Użytkownik patrzy na sidebar aplikacji
THEN: Sidebar wyświetla sekcję "Home" z 5 linkami w tej kolejności: Home Overview, Shopping, Tasks, Activity, Analytics
AND: Sekcja "Pipeline" NIE jest widoczna w DOM (nie jest po prostu ukryta z `visibility:hidden` — nie istnieje w DOM)
AND: Sekcja "Settings" NIE jest widoczna w DOM
AND: Łącznie widoczna jest 1 sekcja i 5 linków nawigacyjnych

### AC-3: HELPER widzi tylko sekcję Home z 2 elementami (Tasks + Shopping)
GIVEN: Użytkownik `zuza@rodzina.pl` jest zalogowany z rolą `HELPER`
AND: `useUser()` zwraca `{ user: { id: "uuid-zuza", email: "zuza@rodzina.pl" }, role: "HELPER", isLoading: false }`
WHEN: Użytkownik patrzy na sidebar aplikacji
THEN: Sidebar wyświetla sekcję "Home" z dokładnie 2 linkami: Tasks oraz Shopping
AND: Linki "Home Overview", "Activity" i "Analytics" NIE są widoczne w DOM
AND: Sekcja "Pipeline" NIE jest widoczna w DOM
AND: Sekcja "Settings" NIE jest widoczna w DOM

### AC-4: Aktywny NavItem jest podświetlony kolorem fioletowym
GIVEN: Użytkownik jest na stronie `/home/tasks` (route aktywna)
WHEN: Sidebar jest widoczny
THEN: NavItem "Tasks" ma klasę CSS wskazującą aktywny stan (np. `bg-[#1e1b4b]` i kolor tekstu `#818cf8`)
AND: Wszystkie inne NavItem mają domyślny styl (kolor tekstu `#6b7280`, brak tła)
AND: Aktywny NavItem NIE jest klikalny ponownie (lub kliknięcie nie wykonuje nawigacji — `href` wskazuje tę samą stronę)

### AC-5: Loading skeleton sidebara wyświetla się gdy isLoading=true
GIVEN: Aplikacja właśnie się załadowała i `useUser()` zwraca `{ user: null, role: null, isLoading: true }`
WHEN: Sidebar próbuje się wyrenderować
THEN: Zamiast sekcji nawigacji wyświetlają się 3 elementy skeleton w miejscu nav items
AND: Skeleton elementy mają animację pulse (CSS `animate-pulse`) i kolor tła `bg-[#2a2540]`
AND: Każdy skeleton ma zaokrąglone rogi (rounded), wysokość `h-7` i szerokość wypełniającą dostępną przestrzeń (`w-full`)
AND: User pill na dole sidebara RÓWNIEŻ wyświetla skeleton (zamiast avatar + email)
AND: Po załadowaniu (`isLoading` → `false`) skeleton znika i pojawia się właściwa nawigacja

### AC-6: User pill na dole sidebara wyświetla dane zalogowanego usera
GIVEN: User `angelika@rodzina.pl` z rolą `HELPER_PLUS` jest zalogowany
AND: `isLoading === false`
WHEN: Użytkownik patrzy na dół sidebara
THEN: Widoczny jest pill z awatarem (koło z inicjałami "A" = pierwsza litera imienia z emaila "angelika")
AND: Pill wyświetla adres email: "angelika@rodzina.pl"
AND: Pill wyświetla badge z rolą: "HELPER_PLUS" (tekst skrótu lub pełna nazwa — patrz EC-3)
AND: Badge roli ma kolor zgodny z rolą: ADMIN=fioletowy, HELPER_PLUS=niebieski, HELPER=szary

### AC-7: Kliknięcie user pill otwiera menu z opcją "Wyloguj"
GIVEN: User jest zalogowany i user pill jest widoczny
WHEN: Użytkownik klika user pill
THEN: Pojawia się małe menu (dropdown lub popover) z jedną opcją: "Wyloguj"
AND: Menu ma tło `bg-[#1a1730]` z obramowaniem `border border-[#2a2540]` i `border-radius:8px`
WHEN: Użytkownik klika "Wyloguj" w tym menu
THEN: Wywoływana jest funkcja `supabase.auth.signOut()` (lub przekierowanie do `/api/auth/logout`)
AND: Po wylogowaniu użytkownik jest przekierowany na stronę `/login`
AND: Menu zamyka się

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: layout-level (`src/app/(dashboard)/layout.tsx`) — sidebar widoczny na wszystkich podstronach dashboardu
Komponenty główne: `src/components/layout/Sidebar.tsx` (modyfikacja) + nowe pliki poniżej
Pliki do stworzenia:
- `src/components/layout/NavConfig.ts`
- `src/components/layout/NavSection.tsx`
- `src/components/layout/NavItem.tsx`
- `src/components/layout/UserPill.tsx`
- `src/components/layout/SidebarSkeleton.tsx`

### Implementacja krok po kroku

#### Krok 1 — `src/components/layout/NavConfig.ts` — konfiguracja nawigacji

Stwórz plik `src/components/layout/NavConfig.ts` z następującą treścią:

```typescript
// src/components/layout/NavConfig.ts

import type { Permission } from '@/types/auth.types';

// Typy dla konfiguracji nawigacji
export interface NavItemConfig {
  id: string;                   // unikalne ID (np. "overview", "tasks")
  label: string;                // wyświetlana nazwa (po polsku lub angielsku per projekt)
  icon: string;                 // emoji lub string z ikoną (np. "📊", "🛒")
  href: string;                 // pełna ścieżka routingu (np. "/dashboard", "/home/tasks")
  requirePermission?: keyof Permission; // jeśli ustawione — NavItem wymaga tego uprawnienia
}

export interface NavSectionConfig {
  id: string;                   // unikalne ID sekcji (np. "pipeline", "home", "settings")
  label: string;                // etykieta sekcji (np. "Pipeline", "Home", "Settings")
  requirePermission: keyof Permission;  // uprawnienie wymagane do widoczności CAŁEJ sekcji
  items: NavItemConfig[];       // lista elementów w sekcji
}

// ─── KONFIGURACJA NAWIGACJI ───────────────────────────────────────────────────
// Każda sekcja ma requirePermission — sekcja jest widoczna tylko gdy
// usePermissions()[requirePermission] === true.
//
// Wyjątek: sekcja "Home" jest widoczna dla ADMIN, HELPER_PLUS i HELPER
// (canAccessHome = true dla wszystkich ról), ale HELPER widzi tylko
// subset elementów (Tasks + Shopping) — te bez requirePermission.
// Elementy z requirePermission: "canAccessAnalytics" są ukryte dla HELPER.
// ─────────────────────────────────────────────────────────────────────────────

export const NAV_CONFIG: NavSectionConfig[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    requirePermission: 'canAccessDashboard',   // tylko ADMIN (canAccessDashboard = true)
    items: [
      { id: 'pipeline-overview', label: 'Overview', icon: '📊', href: '/dashboard' },
      { id: 'pipeline-models',   label: 'Models',   icon: '🤖', href: '/dashboard/models' },
      { id: 'pipeline-pipeline', label: 'Pipeline', icon: '▶️', href: '/dashboard/pipeline' },
      { id: 'pipeline-eval',     label: 'Eval',     icon: '🧪', href: '/dashboard/eval' },
      { id: 'pipeline-patterns', label: 'Patterns', icon: '🧠', href: '/dashboard/patterns' },
      { id: 'pipeline-health',   label: 'Health',   icon: '❤️', href: '/dashboard/health' },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    requirePermission: 'canAccessHome',  // ADMIN + HELPER_PLUS + HELPER (wszyscy)
    items: [
      // Bez requirePermission = widoczne dla wszystkich ról w tej sekcji
      { id: 'home-overview',   label: 'Home Overview', icon: '🏠', href: '/home' },
      { id: 'home-shopping',   label: 'Shopping',      icon: '🛒', href: '/home/shopping' },
      { id: 'home-tasks',      label: 'Tasks',         icon: '✅', href: '/home/tasks' },
      // Z requirePermission: "canAccessAnalytics" = widoczne tylko dla ADMIN + HELPER_PLUS
      { id: 'home-activity',   label: 'Activity',      icon: '📅', href: '/home/activity',  requirePermission: 'canAccessAnalytics' },
      { id: 'home-analytics',  label: 'Analytics',     icon: '📈', href: '/home/analytics', requirePermission: 'canAccessAnalytics' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    requirePermission: 'canManageUsers',  // tylko ADMIN (canManageUsers = true)
    items: [
      { id: 'settings-users',  label: 'Users',  icon: '👥', href: '/settings/users' },
      { id: 'settings-system', label: 'System', icon: '⚙️', href: '/settings/system' },
    ],
  },
];
```

**KRYTYCZNE**: Element `home-overview` (Home Overview) NIE ma `requirePermission` — jest widoczny dla wszystkich którzy widzą sekcję "Home". HELPER widzi sekcję "Home" (canAccessHome=true) ale... sprawdź tabelę powyżej: Home Overview dla HELPER = ❌. 

**POPRAWKA do NAV_CONFIG**: Home Overview dla HELPER powinno być ukryte. Dodaj `requirePermission: 'canAccessAnalytics'` do `home-overview`:

```typescript
{ id: 'home-overview', label: 'Home Overview', icon: '🏠', href: '/home', requirePermission: 'canAccessAnalytics' },
```

Albo dodaj nowe uprawnienie `canAccessHomeOverview` w STORY-3.5 (ale to out-of-scope tej story). **Rozwiązanie pragmatyczne**: używaj `canAccessAnalytics` jako proxy dla "ADMIN lub HELPER_PLUS". HELPER ma `canAccessAnalytics: false`, więc Home Overview + Activity + Analytics zostaną ukryte. HELPER widzi tylko Tasks i Shopping. ✅ Zgadza się z tabelą.

Ostateczny NAV_CONFIG dla sekcji home:
```typescript
items: [
  { id: 'home-overview',  label: 'Home Overview', icon: '🏠', href: '/home',           requirePermission: 'canAccessAnalytics' },
  { id: 'home-shopping',  label: 'Shopping',      icon: '🛒', href: '/home/shopping'   /* brak requirePermission */ },
  { id: 'home-tasks',     label: 'Tasks',         icon: '✅', href: '/home/tasks'      /* brak requirePermission */ },
  { id: 'home-activity',  label: 'Activity',      icon: '📅', href: '/home/activity',  requirePermission: 'canAccessAnalytics' },
  { id: 'home-analytics', label: 'Analytics',     icon: '📈', href: '/home/analytics', requirePermission: 'canAccessAnalytics' },
],
```

HELPER (canAccessAnalytics=false) widzi: Shopping + Tasks. ✅

#### Krok 2 — `src/components/layout/NavItem.tsx`

```typescript
// src/components/layout/NavItem.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItemConfig } from './NavConfig';

interface NavItemProps {
  item: NavItemConfig;
}

export function NavItem({ item }: NavItemProps) {
  const pathname = usePathname();
  
  // Active gdy pathname dokładnie pasuje lub pathname zaczyna się od href + "/"
  // Wyjątek: "/" nie jest traktowane jako prefix dla wszystkiego
  const isActive = pathname === item.href || 
    (item.href !== '/' && pathname.startsWith(item.href + '/'));

  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] mb-0.5',
        'transition-colors duration-150',
        isActive
          ? 'bg-[#1e1b4b] text-[#818cf8] font-semibold'    // aktywny: fioletowe tło + jasny fioletowy tekst
          : 'text-[#6b7280] hover:bg-[#2a2540] hover:text-[#e6edf3]'  // nieaktywny
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="w-4 text-center text-[13px]" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
```

#### Krok 3 — `src/components/layout/NavSection.tsx`

```typescript
// src/components/layout/NavSection.tsx
'use client';

import { usePermissions } from '@/contexts/RoleContext';
import { NavItem } from './NavItem';
import type { NavSectionConfig } from './NavConfig';

interface NavSectionProps {
  section: NavSectionConfig;
}

export function NavSection({ section }: NavSectionProps) {
  const permissions = usePermissions();

  // Sprawdź czy sekcja jest dostępna dla aktualnego usera
  if (!permissions[section.requirePermission]) {
    return null;  // NIE renderuj sekcji — całkowicie z DOM
  }

  // Przefiltruj itemy: renderuj tylko te, które user ma uprawnienie zobaczyć
  const visibleItems = section.items.filter(item => {
    if (!item.requirePermission) return true;  // brak requirePermission = zawsze widoczny (jeśli sekcja widoczna)
    return permissions[item.requirePermission];
  });

  // Jeśli wszystkie itemy są ukryte — nie renderuj sekcji (edge case)
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-2">
      {/* Etykieta sekcji */}
      <div className="text-[10px] font-bold text-[#3d3757] uppercase tracking-[0.08em] px-2 py-2.5 pb-0.5">
        {section.label}
      </div>
      {/* Elementy sekcji */}
      {visibleItems.map(item => (
        <NavItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

#### Krok 4 — `src/components/layout/SidebarSkeleton.tsx`

```typescript
// src/components/layout/SidebarSkeleton.tsx

export function SidebarSkeleton() {
  return (
    <div className="flex-1 p-1.5 space-y-1" aria-label="Ładowanie nawigacji..." aria-busy="true">
      {/* Skeleton etykiety sekcji */}
      <div className="h-3 w-16 bg-[#2a2540] rounded animate-pulse mx-2 my-2.5" />
      {/* 3 skeleton NavItem */}
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="h-7 w-full bg-[#2a2540] rounded-lg animate-pulse"
          style={{ opacity: 1 - i * 0.1 }}  // lekkie zanikanie dla estetyki
        />
      ))}
    </div>
  );
}

export function UserPillSkeleton() {
  return (
    <div className="flex items-center gap-2 p-2.5 m-2.5 bg-[#13111c] border border-[#2a2540] rounded-lg animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-7 h-7 rounded-full bg-[#2a2540] flex-shrink-0" />
      {/* Tekst skeleton */}
      <div className="flex-1 space-y-1">
        <div className="h-2.5 w-28 bg-[#2a2540] rounded" />
        <div className="h-2 w-16 bg-[#2a2540] rounded" />
      </div>
    </div>
  );
}
```

#### Krok 5 — `src/components/layout/UserPill.tsx`

```typescript
// src/components/layout/UserPill.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/RoleContext';
import type { Role } from '@/types/auth.types';

// Kolory ról — zgodne z mockupem kira-dashboard-mockup-v3.html
const ROLE_BADGE_STYLES: Record<Role, { bg: string; text: string; label: string }> = {
  ADMIN:       { bg: 'bg-[#2d1b4a]', text: 'text-[#a78bfa]', label: 'ADMIN' },
  HELPER_PLUS: { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]', label: 'HELPER+' },
  HELPER:      { bg: 'bg-[#2a2540]', text: 'text-[#9ca3af]', label: 'HELPER' },
};

// Inicjały z emaila: "angelika@rodzina.pl" → "A"
function getInitials(email: string): string {
  return email.charAt(0).toUpperCase();
}

export function UserPill() {
  const { user, role } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Zamknij menu przy kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Zamknij menu przy Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!user || !role) return null;

  const badgeStyle = ROLE_BADGE_STYLES[role];

  return (
    <div className="relative" ref={menuRef}>
      {/* User Pill — przycisk */}
      <button
        onClick={() => setMenuOpen(prev => !prev)}
        className="w-full flex items-center gap-2 p-2.5 bg-[#13111c] border border-[#2a2540] rounded-lg
                   hover:border-[#3b3d7a] transition-colors duration-150 text-left"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Konto użytkownika: ${user.email}. Rola: ${role}. Kliknij aby zobaczyć opcje.`}
      >
        {/* Avatar — kółko z inicjałami */}
        <div
          className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#3b82f6]
                     flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
          aria-hidden="true"
        >
          {getInitials(user.email)}
        </div>
        {/* Email i rola */}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[#e6edf3] truncate">{user.email}</div>
          <div className="mt-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${badgeStyle.bg} ${badgeStyle.text}`}>
              {badgeStyle.label}
            </span>
          </div>
        </div>
        {/* Strzałka */}
        <span className="text-[#6b7280] text-[10px]" aria-hidden="true">
          {menuOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a1730] border border-[#2a2540]
                     rounded-lg shadow-lg overflow-hidden z-50"
        >
          <button
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-[#e6edf3]
                       hover:bg-[#2a2540] transition-colors duration-150 text-left"
          >
            <span aria-hidden="true">🚪</span>
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Krok 6 — Modyfikacja `src/components/layout/Sidebar.tsx`

Zastąp (lub rozbuduj) istniejący Sidebar.tsx. Sidebar musi:
1. Importować `useUser` z RoleContext
2. Gdy `isLoading=true` → renderować `SidebarSkeleton` i `UserPillSkeleton`
3. Gdy `isLoading=false` → renderować sekcje przez `NAV_CONFIG.map(section => <NavSection key={section.id} section={section} />)`
4. Na dole renderować `UserPill`

```typescript
// src/components/layout/Sidebar.tsx
// MODYFIKACJA istniejącego pliku z STORY-1.8
// Zachowaj istniejący układ (IconRail + TextNav / lub obecna struktura)
// Dodaj poniższą logikę do sekcji nawigacji (TextNav lub side-nav-items)

'use client';

import { useUser } from '@/contexts/RoleContext';
import { NAV_CONFIG } from './NavConfig';
import { NavSection } from './NavSection';
import { UserPill } from './UserPill';
import { SidebarSkeleton, UserPillSkeleton } from './SidebarSkeleton';

// ─── Główny komponent sidebara ───────────────────────────────────────────────
// Zachowaj istniejącą strukturę HTML/JSX z STORY-1.8 (IconRail, header z project
// switcherem, footer z bridge pill). Zamień TYLKO sekcję nav items na poniższy kod.
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { isLoading } = useUser();

  return (
    <div className="w-[198px] min-w-[198px] bg-[#1a1730] border-r border-[#2a2540] flex flex-col">

      {/* ─── HEADER (project switcher) — zachować z STORY-1.8 ─── */}
      {/* ... istniejący header z STORY-1.8 ... */}

      {/* ─── NAV ITEMS — ZMIENIONA SEKCJA ─── */}
      <div className="flex-1 p-1.5 overflow-y-auto">
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          NAV_CONFIG.map(section => (
            <NavSection key={section.id} section={section} />
          ))
        )}
      </div>

      {/* ─── FOOTER — user pill (zamiast lub obok bridge pill) ─── */}
      <div className="p-2.5 border-t border-[#2a2540]">
        {isLoading ? (
          <UserPillSkeleton />
        ) : (
          <UserPill />
        )}
      </div>

    </div>
  );
}
```

**UWAGA**: Jeśli STORY-1.8 używa oddzielnych komponentów `IconRail` i `TextNav`, modyfikuj `TextNav.tsx` zamiast `Sidebar.tsx` — dodaj `useUser()` do `TextNav` i zastąp statyczną listę elementów powyższą logiką.

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `Sidebar` | Layout wrapper | brak | loading (skeleton), filled (nawigacja) |
| `NavSection` | Sekcja nawigacji | `section: NavSectionConfig` | visible (ma uprawnienie), null (brak uprawnienia) |
| `NavItem` | Link nawigacyjny | `item: NavItemConfig` | active (fioletowy), inactive (szary) |
| `UserPill` | User info button | brak (czyta z useUser) | normal, menu-open |
| `SidebarSkeleton` | Skeleton loader | brak | zawsze animate-pulse |
| `UserPillSkeleton` | Skeleton loadera | brak | zawsze animate-pulse |

### Stany widoku sidebara

**Loading (`isLoading=true`):**
- W miejscu nawigacji: 1 skeleton etykiety sekcji (h-3, w-16, animate-pulse) + 3 skeleton NavItem (h-7, w-full, animate-pulse)
- W miejscu UserPill: skeleton (avatar circle + 2 linie tekstu)
- Animacja: `animate-pulse` z Tailwind (CSS: `opacity` oscyluje 1→0.5→1 co 2s)

**Filled — ADMIN:**
- 3 sekcje nawigacji: Pipeline (6 items) + Home (5 items) + Settings (2 items)
- UserPill: inicjały "M" w gradiencie fioletowo-niebieskim, email, badge "ADMIN" (fioletowy)

**Filled — HELPER_PLUS:**
- 1 sekcja: Home (5 items: Home Overview, Shopping, Tasks, Activity, Analytics)
- UserPill: inicjały "A", email, badge "HELPER+" (niebieski)

**Filled — HELPER:**
- 1 sekcja: Home (2 items: Shopping, Tasks)
- UserPill: inicjały "Z" lub "I", email, badge "HELPER" (szary)

**Error (useUser() error):**
- `isLoading=false`, `user=null`, `role=null`
- Nawigacja jest pusta (żadna sekcja nie spełnia wymagań uprawnień — `NO_PERMISSIONS`)
- UserPill nie renderuje się (`if (!user || !role) return null`)
- Sidebar jest praktycznie pusty — to dopuszczalne, bo middleware (STORY-3.3) powinien wcześniej przekierować na `/login`

### Flow interakcji (krok po kroku)

```
1. User wchodzi na dowolną stronę dashboardu → layout.tsx renderuje Sidebar
2. Sidebar wywołuje useUser() → isLoading=true, user=null, role=null
3. Sidebar renderuje SidebarSkeleton (3 pulse elementy) + UserPillSkeleton
4. Supabase odpowiada → RoleContext aktualizuje stan → isLoading=false, user=User, role=Role
5. Sidebar re-renderuje → isLoading=false → NAV_CONFIG.map() iteruje przez sekcje
6. Dla każdej sekcji: NavSection sprawdza permissions[requirePermission]
   - jeśli false → return null (sekcja nie istnieje w DOM)
   - jeśli true → renderuje etykietę + przefiltrowane NavItem
7. NavItem wywołuje usePathname() → porównuje z item.href → ustawia active state
8. UserPill renderuje się z danymi z useUser()
9. User klika NavItem → Next.js router.push(item.href) → usePathname() zmienia się
10. NavItem który był aktywny traci styl aktywny → nowy NavItem otrzymuje styl aktywny
11. User klika UserPill → setMenuOpen(true) → pojawia się dropdown z "Wyloguj"
12. User klika "Wyloguj" → supabase.auth.signOut() → router.push('/login')
```

### Responsive / Dostępność
- Mobile (375px+): Sidebar jest ukryty na mobile (toggle via hamburger menu — out of scope tej story); sidebar wyświetla się jako `w-[198px]` na desktop
- Desktop (1280px+): sidebar zawsze widoczny, `flex-col`, pełna wysokość ekranu
- Keyboard navigation: Tab przechodzi przez NavItem linki w kolejności DOM; Enter aktywuje link; Escape zamyka UserPill menu
- ARIA:
  - `aria-current="page"` na aktywnym NavItem
  - `aria-expanded` i `aria-haspopup="menu"` na przycisku UserPill
  - `role="menu"` i `role="menuitem"` na elementach menu
  - `aria-label` na UserPill przycisku z pełnym opisem (email + rola)
  - `aria-busy="true"` na skeleton podczas ładowania

---

## ⚠️ Edge Cases

### EC-1: Zmiana roli w trakcie aktywnej sesji — user na stronie nieautoryzowanej
Scenariusz: ADMIN zmienia rolę Angeliki (HELPER_PLUS) na HELPER przez API. Angelika ma otwartą stronę `/home/activity`. RoleContext nie odświeża roli automatycznie bez przeładowania sesji (opisane w STORY-3.5 EC-5).
Oczekiwane zachowanie: Sidebar nadal pokazuje Activity i Analytics (stara rola w pamięci). Po przeładowaniu strony lub ponownym logowaniu — RoleContext pobiera nową rolę i sidebar się aktualizuje. NIE wymaga implementacji w tej story — jest to znane ograniczenie opisane w STORY-3.5.

### EC-2: User bez roli w user_roles (useUser zwraca role=null)
Scenariusz: User jest zalogowany (sesja Supabase aktywna) ale nie ma rekordu w tabeli `user_roles`. `useUser()` zwraca `{ user: User, role: null, isLoading: false }`. `usePermissions()` zwraca `NO_PERMISSIONS` (wszystkie false).
Oczekiwane zachowanie: `isLoading=false` → Sidebar próbuje renderować NAV_CONFIG.map() → każda NavSection ma `requirePermission` którego wartość w NO_PERMISSIONS = false → żadna sekcja nie renderuje się → sidebar jest pusty (tylko header i footer z UserPill). UserPill: `if (!user || !role) return null` → UserPill też nie renderuje się. Sidebar pokazuje tylko nagłówek projektu. Middleware z STORY-3.3 powinien taki przypadek złapać wcześniej i przekierować na `/login`.

### EC-3: Email z długą nazwą lokalną (overflow)
Scenariusz: User ma email `bardzo.dlugi.email.adres.uzytkownika@rodzina.pl` — 45 znaków.
Oczekiwane zachowanie: UserPill wyświetla email z `truncate` (CSS: `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`) — email jest obcięty z "..." na końcu. Pełny email jest dostępny przez `aria-label` na przycisku UserPill. Sidebar NIE rozszerza się poziomo.

### EC-4: pathname z trailing slash lub query params
Scenariusz: User jest na `/home/tasks?filter=done` lub `/home/tasks/`. NavItem dla "Tasks" ma `href: "/home/tasks"`.
Oczekiwane zachowanie: `pathname` z `usePathname()` NIE zawiera query params (Next.js 13+ app router zachowuje się tak by default). Sprawdzenie `pathname === item.href` → `/home/tasks?filter=done` !== `/home/tasks` → false. Sprawdzenie `pathname.startsWith(item.href + '/')` → `/home/tasks?filter=done`.startsWith(`/home/tasks/`) → false. NavItem "Tasks" może być nieaktywny. **Rozwiązanie**: użyj `pathname.split('?')[0]` lub `new URL(pathname, 'http://x').pathname` do oczyszczenia pathname przed porównaniem.

### EC-5: Szybkie przejście między rolami (React StrictMode double-render)
Scenariusz: W trybie React.StrictMode useEffect w RoleProvider jest wywoływany dwukrotnie w dev mode — powoduje dwa zapytania do Supabase.
Oczekiwane zachowanie: Sidebar nie miga ani nie pokazuje błędów. `isLoading` przechodzi: `true → false → true → false` (podwójne wywołanie), ale user widzi tylko krótki skeleton. W produkcji (bez StrictMode) problem nie występuje. Nie wymaga dodatkowej implementacji — jest to znane zachowanie React StrictMode.

### EC-6: NAV_CONFIG rozszerzony o nową sekcję bez wymaganych uprawnień
Scenariusz: Developer dodaje nową sekcję do NAV_CONFIG bez `requirePermission` (pomyłka — pole jest wymagane przez TypeScript `NavSectionConfig`).
Oczekiwane zachowanie: TypeScript kompilator zgłasza błąd `Property 'requirePermission' is missing in type...`. Story jest bezpieczna przez silne typowanie — nie można przypadkowo dodać sekcji bez uprawnień.

---

## 🚫 Out of Scope tej Story
- Animacja zwijania/rozwijania sidebara (collapse/expand)
- Hamburger menu na mobile (sidebar drawer)
- Wyszukiwarka w sidebarze
- Badge z liczbą powiadomień na NavItem (te istniejące z STORY-1.8 mogą pozostać statycznie)
- Real-time aktualizacja roli bez przeładowania strony (STORY-3.5 EC-5)
- Ikonki wektorowe (SVG) zamiast emoji — emoji jest akceptowalnym placeholderem
- Project switcher (istniejący z STORY-1.8 pozostaje bez zmian)
- Bridge status pill w footer (pozostaje z STORY-1.8)

---

## ✔️ Definition of Done
- [ ] Plik `src/components/layout/NavConfig.ts` z `NAV_CONFIG` tablicą 3 sekcji i poprawną konfiguracją uprawnień
- [ ] Komponent `NavSection` renderuje sekcję tylko gdy `permissions[requirePermission] === true`; zwraca `null` dla niedostępnych sekcji
- [ ] Komponent `NavSection` filtruje items — ukrywa te z `requirePermission` gdy user nie ma uprawnienia
- [ ] Komponent `NavItem` używa `usePathname()` do wykrywania aktywnej trasy; aktywny item ma style `bg-[#1e1b4b] text-[#818cf8] font-semibold`
- [ ] `SidebarSkeleton` renderuje się gdy `isLoading=true` — 3 elementy z `animate-pulse`
- [ ] `UserPillSkeleton` renderuje się gdy `isLoading=true`
- [ ] `UserPill` wyświetla inicjały z emaila, pełny email (truncate), badge z rolą (kolory per rola)
- [ ] Kliknięcie UserPill otwiera menu z "Wyloguj"; kliknięcie "Wyloguj" wywołuje `supabase.auth.signOut()` i przekierowuje na `/login`
- [ ] Sidebar zamknięty (isLoading=false, role=null) nie crashuje — puste NavSection, brak UserPill
- [ ] ADMIN widzi 3 sekcje (13 nav items), HELPER_PLUS widzi 1 sekcję (5 items), HELPER widzi 1 sekcję (2 items)
- [ ] Kod przechodzi linter bez błędów (`next lint`)
- [ ] Brak `any` — TypeScript strict mode, wszystkie typy z `@/types/auth.types.ts`
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading skeleton, empty/no-role, filled per rola, logout menu)
- [ ] Keyboard navigation: Tab/Enter/Escape działają w UserPill menu
- [ ] ARIA atrybuty: `aria-current`, `aria-expanded`, `aria-haspopup`, `role="menu"`, `role="menuitem"`
- [ ] Widok działa na desktop 1280px bez horizontal scroll
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Story review przez PO
