// components/users/DeleteUserButton.tsx
// Przycisk usunięcia użytkownika z modalem potwierdzenia

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface DeleteUserButtonProps {
  userId: string;
  userEmail: string;
  disabled: boolean;
  onUserDeleted: () => void;
}

export function DeleteUserButton({
  userId,
  userEmail,
  disabled,
  onUserDeleted,
}: DeleteUserButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);

  // Zamknij modal na Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showConfirm) {
      setShowConfirm(false);
    }
  }, [showConfirm]);

  useEffect(() => {
    if (showConfirm) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [showConfirm, handleKeyDown]);

  async function handleDelete() {
    setIsLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? `Błąd usuwania użytkownika (${res.status}). Spróbuj ponownie.`);
        return;
      }

      toast.success(`Użytkownik ${userEmail} został usunięty`);
      onUserDeleted(); // Odśwież tabelę
    } catch {
      toast.error('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }

  const isDisabled = disabled || isLoading;

  return (
    <>
      {/* Przycisk Usuń */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDisabled}
        className={[
          'px-2.5 py-1 rounded-lg text-[12px] transition-colors',
          isDisabled
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-2xl w-[480px] max-w-[90vw] shadow-xl">
            <div className="p-5 border-b border-[#2a2540]">
              <h3
                id="confirm-delete-title"
                className="text-[16px] font-bold text-[#e6edf3]"
              >
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
