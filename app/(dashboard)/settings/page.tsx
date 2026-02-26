// app/(dashboard)/settings/page.tsx
// Redirect /settings → /settings/users

import { redirect } from 'next/navigation'

export default function SettingsPage() {
  redirect('/settings/users')
}
