// components/users/RoleBadge.tsx
// Badge z kolorowym tłem wskazujący rolę użytkownika

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
