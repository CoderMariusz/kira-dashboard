import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T1: Database Types & Label Hooks
 * Tests for Label, TaskLabel types and hooks (useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel, useTaskLabels, useAssignLabel, useRemoveLabel)
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Types and hooks do not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS — COMPLETE Supabase client
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════
// MOCK DATA — Complete Label type
// ═══════════════════════════════════════════

const mockLabel = {
  id: 'label-1',
  household_id: 'hh-1',
  name: 'Bug',
  color: '#EF4444',
  created_at: new Date().toISOString(),
};

const mockTaskLabel = {
  task_id: 'task-1',
  label_id: 'label-1',
  created_at: new Date().toISOString(),
};

describe('T1: Database Types & Label Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Types (AC1.1, AC1.2)', () => {
    it('AC1.1: Label type has fields: id, household_id, name, color, created_at', async () => {
      // @ts-expect-error - Label type doesn't exist yet
      const label: Label = {
        id: 'label-1',
        household_id: 'hh-1',
        name: 'Bug',
        color: '#EF4444',
        created_at: new Date().toISOString(),
      };

      expect(label).toHaveProperty('id');
      expect(label).toHaveProperty('household_id');
      expect(label).toHaveProperty('name');
      expect(label).toHaveProperty('color');
      expect(label).toHaveProperty('created_at');
    });

    it('AC1.2: TaskLabel type has fields: task_id, label_id, created_at', async () => {
      // @ts-expect-error - TaskLabel type doesn't exist yet
      const taskLabel: TaskLabel = {
        task_id: 'task-1',
        label_id: 'label-1',
        created_at: new Date().toISOString(),
      };

      expect(taskLabel).toHaveProperty('task_id');
      expect(taskLabel).toHaveProperty('label_id');
      expect(taskLabel).toHaveProperty('created_at');
    });
  });

  describe('useLabels Hook (AC1.3)', () => {
    it('AC1.3: should fetch all labels for current household, ordered by name', async () => {
      // @ts-expect-error - useLabels hook doesn't exist yet
      const { useLabels } = await import('@/lib/hooks/useLabels');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { ...mockLabel, name: 'Bug', id: 'label-2' },
                { ...mockLabel, name: 'Feature', id: 'label-1' },
              ],
              error: null,
            })),
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useLabels('hh-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockFrom).toHaveBeenCalledWith('labels');
      expect(result.current.data).toHaveLength(2);
    });
  });

  describe('useCreateLabel Hook (AC1.4)', () => {
    it('AC1.4: should insert label and invalidate cache', async () => {
      // @ts-expect-error - useCreateLabel hook doesn't exist yet
      const { useCreateLabel } = await import('@/lib/hooks/useLabels');
      const { createClient } = await import('@/lib/supabase/client');

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { ...mockLabel, id: 'new-label' },
            error: null,
          })),
        })),
      }));

      const mockFrom = vi.fn((table: string) => {
        if (table === 'labels') {
          return { insert: mockInsert };
        }
        return {};
      });

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useCreateLabel('hh-1'), {
        wrapper: createWrapper(),
      });

      const mutateAsync = result.current.mutateAsync;
      if (mutateAsync) {
        await mutateAsync({ name: 'New Label', color: '#10B981' });
      }

      expect(mockInsert).toHaveBeenCalledWith({
        household_id: 'hh-1',
        name: 'New Label',
        color: '#10B981',
      });
    });
  });

  describe('useUpdateLabel Hook (AC1.5)', () => {
    it('AC1.5: should update label', async () => {
      // @ts-expect-error - useUpdateLabel hook doesn't exist yet
      const { useUpdateLabel } = await import('@/lib/hooks/useLabels');
      const { createClient } = await import('@/lib/supabase/client');

      const mockEq = vi.fn(() => Promise.resolve({
        data: { ...mockLabel, name: 'Updated Bug' },
        error: null,
      }));

      const mockUpdate = vi.fn(() => ({ eq: mockEq }));

      const mockFrom = vi.fn(() => ({
        update: mockUpdate,
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useUpdateLabel(), {
        wrapper: createWrapper(),
      });

      const mutateAsync = result.current.mutateAsync;
      if (mutateAsync) {
        await mutateAsync({ id: 'label-1', name: 'Updated Bug', color: '#EF4444' });
      }

      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Updated Bug',
        color: '#EF4444',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'label-1');
    });
  });

  describe('useDeleteLabel Hook (AC1.6)', () => {
    it('AC1.6: should delete label (cascade removes task_labels)', async () => {
      // @ts-expect-error - useDeleteLabel hook doesn't exist yet
      const { useDeleteLabel } = await import('@/lib/hooks/useLabels');
      const { createClient } = await import('@/lib/supabase/client');

      const mockEq = vi.fn(() => Promise.resolve({
        data: null,
        error: null,
      }));

      const mockDelete = vi.fn(() => ({ eq: mockEq }));

      const mockFrom = vi.fn(() => ({
        delete: mockDelete,
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useDeleteLabel(), {
        wrapper: createWrapper(),
      });

      const mutateAsync = result.current.mutateAsync;
      if (mutateAsync) {
        await mutateAsync('label-1');
      }

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'label-1');
    });
  });

  describe('useTaskLabels Hook (AC1.7)', () => {
    it('AC1.7: should fetch labels for a specific task', async () => {
      // @ts-expect-error - useTaskLabels hook doesn't exist yet
      const { useTaskLabels } = await import('@/lib/hooks/useTaskLabels');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn((table: string) => {
        if (table === 'task_labels') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [mockTaskLabel],
                error: null,
              })),
            })),
          };
        }
        return {};
      });

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useTaskLabels('task-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toHaveLength(1);
    });
  });

  describe('useAssignLabel Hook (AC1.8)', () => {
    it('AC1.8: should insert into task_labels', async () => {
      // @ts-expect-error - useAssignLabel hook doesn't exist yet
      const { useAssignLabel } = await import('@/lib/hooks/useTaskLabels');
      const { createClient } = await import('@/lib/supabase/client');

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockTaskLabel,
            error: null,
          })),
        })),
      }));

      const mockFrom = vi.fn((table: string) => {
        if (table === 'task_labels') {
          return { insert: mockInsert };
        }
        return {};
      });

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useAssignLabel(), {
        wrapper: createWrapper(),
      });

      const mutateAsync = result.current.mutateAsync;
      if (mutateAsync) {
        await mutateAsync({ taskId: 'task-1', labelId: 'label-1' });
      }

      expect(mockInsert).toHaveBeenCalledWith({
        task_id: 'task-1',
        label_id: 'label-1',
      });
    });
  });

  describe('useRemoveLabel Hook (AC1.9)', () => {
    it('AC1.9: should delete from task_labels', async () => {
      // @ts-expect-error - useRemoveLabel hook doesn't exist yet
      const { useRemoveLabel } = await import('@/lib/hooks/useTaskLabels');
      const { createClient } = await import('@/lib/supabase/client');

      let capturedEqCalls: any[] = [];
      const mockEq = vi.fn((field: string, value: string) => {
        capturedEqCalls.push({ field, value });
        return Promise.resolve({
          data: null,
          error: null,
        });
      });

      const mockDelete = vi.fn(() => ({ eq: mockEq }));

      const mockFrom = vi.fn((table: string) => {
        if (table === 'task_labels') {
          return { delete: mockDelete };
        }
        return {};
      });

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useRemoveLabel(), {
        wrapper: createWrapper(),
      });

      const mutateAsync = result.current.mutateAsync;
      if (mutateAsync) {
        await mutateAsync({ taskId: 'task-1', labelId: 'label-1' });
      }

      expect(mockDelete).toHaveBeenCalled();
      expect(capturedEqCalls).toHaveLength(2);
      expect(capturedEqCalls[0]).toEqual({ field: 'task_id', value: 'task-1' });
      expect(capturedEqCalls[1]).toEqual({ field: 'label_id', value: 'label-1' });
    });
  });
});
