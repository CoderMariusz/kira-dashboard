/**
 * useHouseholdMembers Hook
 * Kira Dashboard - Fetch household members with React Query
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/database';

// ═══════════════════════════════════════════════════════════
// FETCH: Members for current household
// ═══════════════════════════════════════════════════════════

async function fetchHouseholdMembers(): Promise<Profile[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get user's profile to find household
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single() as { data: { household_id: string | null } | null; error: Error | null };

  if (profileError) throw profileError;
  if (!profile?.household_id) return [];

  // Fetch profiles for this household
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('household_id', profile.household_id)
    .order('display_name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Get profiles for current household
 */
export function useHouseholdMembers() {
  return useQuery({
    queryKey: ['household-members'],
    queryFn: fetchHouseholdMembers,
    staleTime: 60 * 1000, // 1 minute
  });
}
