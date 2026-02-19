// app/page.tsx
// Root redirect — przekierowanie na dashboard.
// Dashboard znajduje się pod /dashboard (z pełnym sidebar + tabs routing).
// Zachowuje query param ?tab= jeśli obecny.

import { redirect } from 'next/navigation'

interface RootPageProps {
  searchParams?: Promise<{ tab?: string }>
}

export default async function RootPage({ searchParams }: RootPageProps) {
  const params = await searchParams
  const tab = params?.tab
  redirect(tab ? `/dashboard?tab=${tab}` : '/dashboard')
}
