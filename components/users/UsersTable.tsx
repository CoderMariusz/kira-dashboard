// components/users/UsersTable.tsx
// Tabela użytkowników z akcjami (zmiana roli, usunięcie)

'use client';

import { useUser } from '@/contexts/RoleContext';
import { RoleBadge } from './RoleBadge';
import { ChangeRoleDropdown } from './ChangeRoleDropdown';
import { DeleteUserButton } from './DeleteUserButton';
import type { UserRow } from '@/types/users.types';

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
  onRoleChanged: () => void;  // Callback po udanej zmianie roli → odśwież listę
  onUserDeleted: () => void;  // Callback po udanym usunięciu → odśwież listę
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

  // Sprawdź czy istnieją inni użytkownicy (nie tylko własne konto)
  const otherUsers = users.filter((u) => u.id !== currentUser?.id);

  return (
    <div className="w-full overflow-x-auto">
      {/* Empty state — tylko ADMIN w tabeli */}
      {otherUsers.length === 0 && (
        <div className="mb-4 p-3 bg-[#13111c] border border-[#2a2540] rounded-lg text-[13px] text-[#6b7280] text-center">
          Nie ma jeszcze innych użytkowników. Zaproś kogoś powyżej!
        </div>
      )}

      <table
        className="w-full"
        role="table"
        aria-label="Lista użytkowników"
      >
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
          {users.map((user) => {
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
                  <span className="text-[12px] text-[#6b7280]">
                    {formatDate(user.created_at)}
                  </span>
                </td>

                {/* Akcje */}
                <td className="py-3">
                  <div
                    className="flex items-center gap-2"
                    title={
                      isOwnAccount
                        ? 'Nie możesz modyfikować własnego konta'
                        : undefined
                    }
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
