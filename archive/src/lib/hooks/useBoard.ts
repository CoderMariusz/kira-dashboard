'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Board, BoardType } from '@/lib/types/app';

// ═══════════════════════════════════════════════════════════
// FETCH: Board by type (home | work)
// ═══════════════════════════════════════════════════════════

async function fetchBoardByType(type: BoardType): Promise<Board | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('type', type)
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = no rows found — nie jest to prawdziwy błąd
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Board;
}

// ═══════════════════════════════════════════════════════════
// FETCH: Wszystkie boardy w household
// ═══════════════════════════════════════════════════════════

async function fetchAllBoards(): Promise<Board[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Board[];
}

// ═══════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════

/**
 * Pobiera board po typie ('home' | 'work')
 * Klucz cache: ['board', type]
 */
export function useBoard(type: BoardType) {
  return useQuery({
    queryKey: ['board', type],
    queryFn: () => fetchBoardByType(type),
    staleTime: 5 * 60 * 1000, // 5 minut — boardy nie zmieniają się często
  });
}

/**
 * Pobiera wszystkie boardy w household
 * Klucz cache: ['boards']
 */
export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: fetchAllBoards,
    staleTime: 5 * 60 * 1000,
  });
}
