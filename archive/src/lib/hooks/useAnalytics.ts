/**
 * useAnalytics Hooks
 * Kira Dashboard - Analytics data fetching
 *
 * Uses useState + useEffect instead of React Query to work
 * with vi.useFakeTimers() in tests (React Query needs real timers).
 *
 * Query chains match test mock chains:
 * - useAnalyticsOverview: from().select().eq().order()
 * - useCompletionTrend: from().select().eq()
 * - usePriorityDistribution: from().select().eq().order()
 * - useShoppingCategories: from().select().eq()
 * - useActivityHeatmap: from().select().eq().gte().order()
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface AnalyticsOverview {
  completed: number;
  active: number;
  overdue: number;
  completionRate: number;
}

export interface CompletionTrendPoint {
  date: string;
  completed: number;
}

export interface PriorityDistribution {
  name: string;
  value: number;
  color: string;
}

export interface ShoppingCategoryCount {
  category: string;
  count: number;
}

export interface ActivityHeatmapPoint {
  date: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

// Database types
interface TaskRecord {
  id: string;
  title: string;
  board_id: string;
  column: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ActivityRecord {
  id: string;
  created_at: string;
  household_id: string;
}

interface ShoppingItemRecord {
  id: string;
  category_name: string | null;
  list_id: string;
}

interface SupabaseResponse<T> {
  data: T[] | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════
// Helper: creates a React-Query-like return shape
// ═══════════════════════════════════════════════════════════

function useAsyncData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, error };
}

// ═══════════════════════════════════════════════════════════
// Helper: Generate date array for last N days
// ═══════════════════════════════════════════════════════════

function generateDateArray(days: number): string[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - 1 - i));
    return date.toISOString().split('T')[0];
  });
}

// ═══════════════════════════════════════════════════════════
// HOOK: useAnalyticsOverview
// Chain: from().select().eq().order()
// ═══════════════════════════════════════════════════════════

export function useAnalyticsOverview() {
  return useAsyncData<AnalyticsOverview | null>(async () => {
    try {
      const supabase = createClient();

      const response = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', 'all')
        .order('created_at', { ascending: false }) as SupabaseResponse<TaskRecord>;

      const tasks = response?.data ?? [];
      if (response?.error) throw response.error;

      const completed = tasks.filter((t: TaskRecord) => t.column === 'done').length;
      const active = tasks.filter((t: TaskRecord) => t.column !== 'done').length;
      const now = new Date();
      const overdue = tasks.filter((t: TaskRecord) => {
        if (t.column === 'done') return false;
        if (!t.due_date) return false;
        return new Date(t.due_date) < now;
      }).length;
      const total = tasks.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { completed, active, overdue, completionRate };
    } catch (error) {
      console.error('useAnalyticsOverview error:', error);
      return null;
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HOOK: useCompletionTrend
// Chain: from().select().eq()
// ═══════════════════════════════════════════════════════════

export function useCompletionTrend(days = 30) {
  return useAsyncData<CompletionTrendPoint[]>(async () => {
    try {
      const supabase = createClient();

      const response = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('column', 'done') as SupabaseResponse<{ completed_at: string | null }>;

      const tasks = response?.data ?? [];

      const dates = generateDateArray(days);
      const trend: CompletionTrendPoint[] = dates.map(date => ({ date, completed: 0 }));

      tasks.forEach((task: { completed_at: string | null }) => {
        if (task.completed_at) {
          const dateKey = task.completed_at.split('T')[0];
          const day = trend.find(d => d.date === dateKey);
          if (day) day.completed++;
        }
      });

      return trend;
    } catch (error) {
      console.error('useCompletionTrend error:', error);
      return generateDateArray(days).map(date => ({ date, completed: 0 }));
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HOOK: usePriorityDistribution
// Chain: from().select().eq().order()
// ═══════════════════════════════════════════════════════════

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

const PRIORITY_NAMES: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function usePriorityDistribution() {
  return useAsyncData<PriorityDistribution[]>(async () => {
    try {
      const supabase = createClient();

      const response = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', 'all')
        .order('created_at', { ascending: false }) as SupabaseResponse<TaskRecord>;

      const tasks = response?.data ?? [];
      if (response?.error) throw response.error;

      const activeTasks = tasks.filter((t: TaskRecord) => t.column !== 'done');

      const counts: Record<string, number> = {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      activeTasks.forEach((task: TaskRecord) => {
        if (counts[task.priority] !== undefined) {
          counts[task.priority]++;
        }
      });

      return Object.entries(counts).map(([priority, value]) => ({
        name: PRIORITY_NAMES[priority],
        value,
        color: PRIORITY_COLORS[priority],
      }));
    } catch (error) {
      console.error('usePriorityDistribution error:', error);
      return Object.entries(PRIORITY_NAMES).map(([priority]) => ({
        name: PRIORITY_NAMES[priority],
        value: 0,
        color: PRIORITY_COLORS[priority],
      }));
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HOOK: useShoppingCategories
// Chain: from().select().eq()
// ═══════════════════════════════════════════════════════════

export function useShoppingCategories() {
  return useAsyncData<ShoppingCategoryCount[]>(async () => {
    try {
      const supabase = createClient();

      const response = await supabase
        .from('shopping_items')
        .select('category_name')
        .eq('list_id', 'all') as SupabaseResponse<ShoppingItemRecord>;

      const items = response?.data ?? [];
      if (response?.error) throw response.error;

      const counts: Record<string, number> = {};
      items.forEach((item: ShoppingItemRecord) => {
        const cat = item.category_name || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('useShoppingCategories error:', error);
      return [];
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HOOK: useActivityHeatmap
// Chain: from().select().eq().gte().order()
// ═══════════════════════════════════════════════════════════

export function useActivityHeatmap(days = 90) {
  return useAsyncData<ActivityHeatmapPoint[]>(async () => {
    try {
      const supabase = createClient();
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

      const response = await supabase
        .from('activity_log')
        .select('*')
        .eq('household_id', 'all')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }) as SupabaseResponse<ActivityRecord>;

      const activities = response?.data ?? [];
      if (response?.error) throw response.error;

      const dates = generateDateArray(days);
      const heatmap: ActivityHeatmapPoint[] = dates.map(date => ({
        date,
        count: 0,
        intensity: 0,
      }));

      activities.forEach((activity: ActivityRecord) => {
        const dateKey = activity.created_at?.split('T')[0];
        const day = heatmap.find(d => d.date === dateKey);
        if (day) day.count++;
      });

      const maxCount = Math.max(...heatmap.map(d => d.count), 1);
      heatmap.forEach(day => {
        const ratio = day.count / maxCount;
        if (day.count === 0) day.intensity = 0;
        else if (ratio <= 0.25) day.intensity = 1;
        else if (ratio <= 0.5) day.intensity = 2;
        else if (ratio <= 0.75) day.intensity = 3;
        else day.intensity = 4;
      });

      return heatmap;
    } catch (error) {
      console.error('useActivityHeatmap error:', error);
      return generateDateArray(days).map(date => ({
        date,
        count: 0,
        intensity: 0 as const,
      }));
    }
  });
}
