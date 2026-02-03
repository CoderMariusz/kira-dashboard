/**
 * useHousehold Hook
 * Kira Dashboard - Fetch household data with React Query
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

type Household = Database['public']['Tables']['households']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface HouseholdWithMembers extends Household {
  members?: Profile[];
}

// ══════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════

/**
 * Fetch household data for the current user's profile
 * 
 * @param profileId - Current user's profile ID (optional, fetches from session if not provided)
 * @returns React Query result with household data, members, loading state, and error
 * 
 * @example
 * ```tsx
 * const { household, members, isLoading, error } = useHousehold();
 * 
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!household) return <NoHouseholdSetup />;
 * 
 * return <div>{household.name}</div>;
 * ```
 */
export function useHousehold(profileId?: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['household', profileId],
    queryFn: async (): Promise<HouseholdWithMembers | null> => {
      const supabase = createClient();

      // If no profileId provided, get current user and their profile
      let currentProfileId = profileId;
      
      if (!currentProfileId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch profile for this user
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('id, household_id')
          .eq('user_id', user.id)
          .single() as { data: Pick<Profile, 'id' | 'household_id'> | null; error: Error | null };

        if (userProfileError) throw userProfileError;
        if (!userProfile?.household_id) return null; // No household assigned yet

        currentProfileId = userProfile.id;
      }

      // Fetch household data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', currentProfileId)
        .single() as { data: Pick<Profile, 'household_id'> | null; error: Error | null };

      if (profileError) throw profileError;
      if (!profileData?.household_id) return null;

      // Fetch household with members
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select(`
          *,
          members:profiles(*)
        `)
        .eq('id', profileData.household_id)
        .single();

      if (householdError) throw householdError;

      return household as HouseholdWithMembers;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Household data doesn't change often
    retry: 1,
  });
}

/**
 * Get household ID for the current user
 * Lighter alternative to useHousehold when you only need the ID
 */
export function useHouseholdId() {
  return useQuery({
    queryKey: ['household-id'],
    queryFn: async (): Promise<string | null> => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('user_id', user.id)
        .single() as { data: Pick<Profile, 'household_id'> | null; error: Error | null };

      return profile?.household_id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Invalidate household cache (call after updates)
 */
export function useInvalidateHousehold() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['household'] });
    queryClient.invalidateQueries({ queryKey: ['household-id'] });
  };
}

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════

/**
 * Type guard for household data
 */
export function hasHousehold(
  data: HouseholdWithMembers | null | undefined
): data is HouseholdWithMembers {
  return !!data && !!data.id;
}

/**
 * Get member count from household
 */
export function getMemberCount(household: HouseholdWithMembers | null): number {
  return household?.members?.length ?? 0;
}
