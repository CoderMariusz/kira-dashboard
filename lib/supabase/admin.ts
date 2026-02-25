import 'server-only'

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  // Support both env var names for backwards compatibility
  const serviceRoleKey =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['SUPABASE_SERVICE_KEY']

  if (!url || !serviceRoleKey) {
    console.error('Missing Supabase admin environment variables')
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient(url.trim(), serviceRoleKey.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
