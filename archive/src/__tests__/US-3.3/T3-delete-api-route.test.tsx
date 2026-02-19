import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

// Table-aware mock pattern (lesson 8) — supports chained .eq() for ownership checks
function createTableMock(responses: Record<string, any>) {
  function chainableEq(config: any): any {
    return vi.fn(() => ({
      eq: chainableEq(config),
      single: vi.fn(() => Promise.resolve(config.selectResult ?? { data: null, error: null })),
    }));
  }

  return vi.fn((table: string) => {
    const config = responses[table] ?? {};
    return {
      select: vi.fn(() => ({
        eq: chainableEq(config),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(config.deleteResult ?? { data: null, error: null })),
      })),
    };
  });
}

let mockGetUser = vi.fn();
let mockFrom: ReturnType<typeof createTableMock>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    get from() { return mockFrom; },
  })),
}));

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T3: DELETE API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: DELETE removes item by id', () => {
    it('should delete item and return success response', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-1' } },
        error: null,
      }));

      const mockProfile = {
        id: 'profile-1',
        user_id: 'user-1',
        household_id: 'household-1',
        display_name: 'John Doe',
      };

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { id: 'item-1', shopping_lists: { household_id: 'household-1' } }, error: null },
          deleteResult: { data: null, error: null },
        },
      });

      const { DELETE } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });
  });

  describe('AC2: Return 401 if not authenticated', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: null },
        error: { message: 'Not authenticated' },
      }));

      const { DELETE } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-2', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-2' }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('AC3: Return 500 on database error', () => {
    it('should return 500 when delete operation fails', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-3' } },
        error: null,
      }));

      const mockProfile = {
        id: 'profile-3',
        user_id: 'user-3',
        household_id: 'household-1',
        display_name: 'Jane Smith',
      };

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { id: 'item-3', shopping_lists: { household_id: 'household-1' } }, error: null },
          deleteResult: { data: null, error: { message: 'Database error' } },
        },
      });

      const { DELETE } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-3', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-3' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toMatch(/Failed to delete item/);
    });
  });

  describe('AC4: Return success: true on success', () => {
    it('should return { success: true } structure on successful delete', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-4' } },
        error: null,
      }));

      const mockProfile = {
        id: 'profile-4',
        user_id: 'user-4',
        household_id: 'household-1',
        display_name: 'Bob Johnson',
      };

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { id: 'item-4', shopping_lists: { household_id: 'household-1' } }, error: null },
          deleteResult: { data: null, error: null },
        },
      });

      const { DELETE } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-4', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-4' }) });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
    });
  });
});
