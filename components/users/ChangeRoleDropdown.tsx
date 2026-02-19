// components/users/ChangeRoleDropdown.tsx
// Select dropdown do zmiany roli użytkownika z modalem potwierdzenia

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/types/auth.types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN',       label: 'ADMIN' },
  { value: 'HELPER_PLUS', label: 'HELPER+' },
  { value: 'HELPER',      label: 'HELPER' },
];

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
  userId,
  userEmail,
  currentRole,
  disabled,
  onRoleChanged,
}: ChangeRoleDropdownProps) {
  const [isLoading, setIsLoading]     = useState(false);
  const [confirmData, setConfirmData] = useState<{ newRole: Role } | null>(null);

  // Zamknij modal na Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && confirmData) {
      setConfirmData(null);
    }
  }, [confirmData]);

  useEffect(() => {
    if (confirmData) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [confirmData, handleKeyDown]);

  function handleRoleChange(newRole: Role) {
    if (newRole === currentRole) return; // Bez zmian — nie otwieraj modalu
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
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? `Błąd zmiany roli (${res.status}). Spróbuj ponownie.`);
        return;
      }

      toast.success(`Rola ${userEmail} zmieniona na ${ROLE_DISPLAY[newRole]}`);
      onRoleChanged(); // Odśwież tabelę
    } catch {
      toast.error('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }

  const isDisabled = disabled || isLoading;

  return (
    <>
      {/* Select dropdown */}
      <select
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value as Role)}
        disabled={isDisabled}
        className={[
          'bg-[#13111c] border border-[#2a2540] rounded-lg px-2 py-1',
          'text-[12px] text-[#e6edf3] outline-none transition-colors',
          isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer focus:border-[#7c3aed]',
        ].join(' ')}
        aria-label={`Zmień rolę ${userEmail}`}
        title={disabled ? 'Nie możesz modyfikować własnego konta' : undefined}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {/* Modal potwierdzenia zmiany roli */}
      {confirmData && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-role-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmData(null);
          }}
        >
          <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-2xl w-[480px] max-w-[90vw] shadow-xl">
            <div className="p-5 border-b border-[#2a2540]">
              <h3
                id="confirm-role-title"
                className="text-[16px] font-bold text-[#e6edf3]"
              >
                Zmiana roli użytkownika
              </h3>
            </div>
            <div className="p-5">
              <p className="text-[14px] text-[#6b7280]">
                Zmienić rolę{' '}
                <span className="text-[#e6edf3] font-semibold">{userEmail}</span>
                {' '}z{' '}
                <span className="text-[#e6edf3] font-semibold">
                  {ROLE_DISPLAY[currentRole]}
                </span>
                {' '}na{' '}
                <span className="text-[#e6edf3] font-semibold">
                  {ROLE_DISPLAY[confirmData.newRole]}
                </span>?
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
