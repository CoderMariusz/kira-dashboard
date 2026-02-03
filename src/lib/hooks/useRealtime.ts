'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════
// TYPY
// ═══════════════════════════════════════════════════════════

interface UseRealtimeOptions {
  /** Nazwa tabeli do nasłuchiwania (np. 'tasks') */
  table: string;
  /** Filtr — np. 'board_id=eq.uuid-xxx' */
  filter?: string;
  /** Klucze React Query do invalidacji przy zmianie */
  queryKeys: string[][];
  /** Czy hook jest aktywny */
  enabled?: boolean;
}

// ═══════════════════════════════════════════════════════════
// HOOK: useRealtime
// ═══════════════════════════════════════════════════════════

/**
 * Nasłuchuje zmian w tabeli Supabase i invaliduje React Query cache.
 */
export function useRealtime({
  table,
  filter,
  queryKeys,
  enabled = true,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    
    // Utwórz unikalną nazwę kanału
    const channelName = `realtime-${table}-${filter ?? 'all'}-${Date.now()}`;

    // Konfiguracja subskrypcji
    const channelConfig: {
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: '*', // nasłuchuj INSERT, UPDATE, DELETE
      schema: 'public',
      table,
    };

    // Dodaj filtr jeśli podany
    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Invaliduj wszystkie podane klucze cache
          console.log(`[Realtime] ${table}: ${payload.eventType}`, payload);
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      )
      .subscribe();

    // Cleanup — usuń subskrypcję przy unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, enabled, queryClient, queryKeys]);
}

// ═══════════════════════════════════════════════════════════
// CONVENIENCE: useTasksRealtime
// ═══════════════════════════════════════════════════════════

/**
 * Convenience hook — nasłuchuje zmian w tasks dla danego board.
 */
export function useTasksRealtime(boardId: string | undefined) {
  useRealtime({
    table: 'tasks',
    filter: boardId ? `board_id=eq.${boardId}` : undefined,
    queryKeys: boardId ? [['tasks', boardId]] : [],
    enabled: !!boardId,
  });
}
