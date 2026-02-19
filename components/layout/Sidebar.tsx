// components/layout/Sidebar.tsx
// Główny sidebar z rozbudowaną nawigacją opartą na rolach.
// Zawiera: ikony sekcji, tekstową nawigację z podziałem na sekcje,
// oraz user pill na dole z opcją wylogowania.

'use client';

import { useUser } from '@/contexts/RoleContext';
import { NAV_CONFIG } from './NavConfig';
import { NavSection } from './NavSection';
import { UserPill } from './UserPill';
import { SidebarSkeleton, UserPillSkeleton } from './SidebarSkeleton';
import { ProjectSwitcher } from './ProjectSwitcher';

/**
 * Główny sidebar dashboard.
 * 
 * Struktura:
 * - Header z ProjectSwitcher (pierwsza litera projektu)
 * - Nawigacja podzielona na sekcje (Pipeline, Home, Settings)
 *   widoczność sekcji zależy od roli użytkownika (RBAC)
 * - Footer z UserPill (avatar, email, rola, menu wylogowania)
 * 
 * Stany:
 * - Loading: wyświetla skeleton nawigacji i user pill
 * - Filled: wyświetla nawigację przefiltrowaną wg uprawnień
 * - Error/no role: pusty sidebar (middleware powinien przekierować na /login)
 */
export function Sidebar() {
  const { isLoading } = useUser();

  return (
    <div className="w-[198px] min-w-[198px] bg-[#1a1730] border-r border-[#2a2540] flex flex-col h-screen">
      
      {/* ─── HEADER: Project Switcher ─── */}
      <div className="p-2.5 border-b border-[#2a2540]">
        <ProjectSwitcher />
      </div>

      {/* ─── NAV: Role-based sections ─── */}
      <div className="flex-1 p-1.5 overflow-y-auto">
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          NAV_CONFIG.map(section => (
            <NavSection key={section.id} section={section} />
          ))
        )}
      </div>

      {/* ─── FOOTER: User Pill ─── */}
      <div className="border-t border-[#2a2540]">
        {isLoading ? (
          <UserPillSkeleton />
        ) : (
          <UserPill />
        )}
      </div>

    </div>
  );
}
