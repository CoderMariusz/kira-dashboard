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
