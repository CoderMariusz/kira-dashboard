import { createBrowserClient } from '@supabase/ssr';

// Singleton — jeden shared client w całej aplikacji.
// Wielokrotne wywołania createBrowserClient() powodują konkurencję o
// Navigator LockManager lock "lock:sb-...-auth-token" → timeout 10s → auth wisi.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
    );
  }
  return _client;
}
