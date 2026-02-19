// app/(dashboard)/settings/users/page.tsx
// Strona /settings/users — zarządzanie użytkownikami (ADMIN only)
// Server Component — logika autoryzacji w UserManagementPage (Client Component)

import { UserManagementPage } from '@/components/users/UserManagementPage';

export default function UsersPage() {
  return <UserManagementPage />;
}
