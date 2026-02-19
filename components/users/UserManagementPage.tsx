// components/users/UserManagementPage.tsx
// Główny komponent strony zarządzania użytkownikami (ADMIN only)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { InviteUserForm } from './InviteUserForm';
import { UsersTable } from './UsersTable';
import type { UserRow } from '@/types/users.types';

// Komponent wyświetlany gdy użytkownik nie ma uprawnień (non-ADMIN)
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-4xl" aria-hidden="true">
        🔒
      </div>
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

// Wewnętrzna zawartość strony — renderowana tylko dla ADMIN
function UserManagementContent() {
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pobierz listę użytkowników z GET /api/users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setFetchError(data.error ?? `Błąd ładowania użytkowników (${res.status})`);
        return;
      }
      const data = await res.json() as { users?: UserRow[] };
      setUsers(data.users ?? []);
    } catch {
      setFetchError('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pobierz użytkowników przy montowaniu komponentu
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="p-5 max-w-4xl">
      {/* Nagłówek strony */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#e6edf3]">
          Zarządzanie użytkownikami
        </h1>
        <p className="text-[13px] text-[#6b7280] mt-1">
          Zapraszaj nowych użytkowników i zarządzaj ich rolami w systemie.
        </p>
      </div>

      {/* Formularz zapraszania — widoczny zawsze (nawet podczas ładowania tabeli) */}
      <InviteUserForm onInviteSuccess={fetchUsers} />

      {/* Sekcja tabeli użytkowników */}
      <div className="bg-[#1a1730] border border-[#2a2540] rounded-xl p-4">
        {/* Nagłówek sekcji tabeli */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#e6edf3]">
            Użytkownicy
            {!isLoading && (
              <span className="ml-2 text-[12px] font-normal text-[#4b4569]">
                ({users.length})
              </span>
            )}
          </h2>
          {/* Przycisk ręcznego odświeżenia */}
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="text-[12px] text-[#818cf8] hover:text-[#a78bfa] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Odśwież listę użytkowników"
          >
            {isLoading ? 'Ładowanie...' : '↻ Odśwież'}
          </button>
        </div>

        {/* Stan ładowania — skeleton rows */}
        {isLoading && (
          <div
            className="space-y-2.5 py-2"
            aria-busy="true"
            aria-label="Ładowanie użytkowników..."
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 bg-[#13111c] rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Stan błędu */}
        {!isLoading && fetchError && (
          <div className="py-4 text-center">
            <p className="text-[13px] text-[#f87171] mb-3">{fetchError}</p>
            <button
              onClick={fetchUsers}
              className="px-3 py-1.5 bg-[#2a2540] text-[#e6edf3] rounded-lg text-[12px] hover:bg-[#3b3d7a] transition-colors cursor-pointer"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* Tabela — załadowana, bez błędu */}
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

// Główny eksport — owinięty w PermissionGate (ADMIN only)
export function UserManagementPage() {
  return (
    <PermissionGate require="canManageUsers" fallback={<AccessDenied />}>
      <UserManagementContent />
    </PermissionGate>
  );
}
