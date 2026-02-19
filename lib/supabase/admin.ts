import 'server-only'

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

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
