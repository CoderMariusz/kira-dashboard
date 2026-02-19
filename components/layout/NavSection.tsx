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

/** Tymczasowa wersja bez RBAC — do debugowania sidebar */
export function NavSectionNoAuth({ section }: NavSectionProps) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-bold text-[#3d3757] uppercase tracking-[0.08em] px-2 py-2.5 pb-0.5">
        {section.label}
      </div>
      {section.items.map(item => (
        <NavItem key={item.id} item={item} />
      ))}
    </div>
  );
}
