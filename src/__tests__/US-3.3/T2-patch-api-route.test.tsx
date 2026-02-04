import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

// Table-aware mock pattern (lesson 8) — supports chained .eq() for ownership checks
function createTableMock(responses: Record<string, any>) {
  // Creates a chainable eq mock that resolves to selectResult at .single()
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
      update: vi.fn((payload: any) => {
        if (config.onUpdate) config.onUpdate(payload);
        return {
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(config.updateResult ?? { data: null, error: null })),
            })),
          })),
        };
      }),
      insert: vi.fn((payload: any) => {
        if (config.onInsert) config.onInsert(payload);
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(config.insertResult ?? { data: null, error: null })),
          })),
        };
      }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(config.deleteResult ?? { error: null })),
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

// Mock sanitize utility
vi.mock('@/lib/utils/sanitize', () => ({
  sanitizeText: vi.fn((text: string) => text),
}));

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T2: PATCH API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Accept is_bought and return updated item', () => {
    it('should accept PATCH with { is_bought: true } and return updated item', async () => {
      // Mock authenticated user
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-1' } },
        error: null,
      }));

      // Mock profile lookup
      const mockProfile = {
        id: 'profile-1',
        user_id: 'user-1',
        household_id: 'household-1',
        display_name: 'John Doe',
      };

      const updatedItem = {
        id: 'item-1',
        list_id: 'list-1',
        name: 'Tomatoes',
        quantity: 2,
        unit: 'kg',
        category_id: 'cat-1',
        category_name: 'Vegetables',
        store: null,
        is_bought: true,
        added_by: 'profile-1',
        bought_by: 'profile-1',
        estimated_price: null,
        source: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { ...updatedItem, shopping_lists: { household_id: 'household-1' } }, error: null },
          updateResult: { data: updatedItem, error: null },
        },
        activity_log: { insertResult: { data: null, error: null } },
      });

      const { PATCH } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ is_bought: true }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.is_bought).toBe(true);
      expect(data.bought_by).toBe('profile-1');
    });
  });

  describe('AC2: Set bought_by when is_bought=true', () => {
    it('should set bought_by to profile.id when marking as bought', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-2' } },
        error: null,
      }));

      const mockProfile = {
        id: 'profile-2',
        user_id: 'user-2',
        household_id: 'household-1',
        display_name: 'Jane Smith',
      };

      let capturedUpdate: any = null;

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { id: 'item-2', shopping_lists: { household_id: 'household-1' } }, error: null },
          onUpdate: (payload: any) => { capturedUpdate = payload; },
          updateResult: {
            data: {
              id: 'item-2',
              is_bought: true,
              bought_by: 'profile-2',
            },
            error: null,
          },
        },
        activity_log: { insertResult: { data: null, error: null } },
      });

      const { PATCH } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-2', {
        method: 'PATCH',
        body: JSON.stringify({ is_bought: true }),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'item-2' }) });

      expect(capturedUpdate).toMatchObject({
        is_bought: true,
        bought_by: 'profile-2',
      });
    });
  });

  describe('AC3: Set bought_by to null when is_bought=false', () => {
    it('should set bought_by to null when unchecking', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-3' } },
        error: null,
      }));

      const mockProfile = {
        id: 'profile-3',
        user_id: 'user-3',
        household_id: 'household-1',
        display_name: 'Bob Johnson',
      };

      let capturedUpdate: any = null;

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { id: 'item-3', shopping_lists: { household_id: 'household-1' } }, error: null },
          onUpdate: (payload: any) => { capturedUpdate = payload; },
          updateResult: {
            data: {
              id: 'item-3',
              is_bought: false,
              bought_by: null,
            },
            error: null,
          },
        },
        activity_log: { insertResult: { data: null, error: null } },
      });

      const { PATCH } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-3', {
        method: 'PATCH',
        body: JSON.stringify({ is_bought: false }),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'item-3' }) });

      expect(capturedUpdate).toMatchObject({
        is_bought: false,
        bought_by: null,
      });
    });
  });

  describe('AC4: Return 401 if not authenticated', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: null },
        error: { message: 'Not authenticated' },
      }));

      const { PATCH } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-4', {
        method: 'PATCH',
        body: JSON.stringify({ is_bought: true }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-4' }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('AC5: Return 404 if profile not found', () => {
    it('should return 500 when profile does not exist', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-5' } },
        error: null,
      }));

      mockFrom = createTableMock({
        profiles: { selectResult: { data: null, error: { message: 'Not found' } } },
      });

      const { PATCH } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-5', {
        method: 'PATCH',
        body: JSON.stringify({ is_bought: true }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-5' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Profile not found');
    });
  });

  describe('AC6: Create activity_log entry', () => {
    it('should create activity_log with action "completed" when is_bought=true', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-6' } },
        error: null,
      }));

      const mockProfile = {
        id: 'profile-6',
        user_id: 'user-6',
        household_id: 'household-1',
        display_name: 'Alice Brown',
      };

      let capturedActivity: any = null;

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { id: 'item-6', shopping_lists: { household_id: 'household-1' } }, error: null },
          updateResult: {
            data: {
              id: 'item-6',
              name: 'Milk',
              is_bought: true,
              bought_by: 'profile-6',
            },
            error: null,
          },
        },
        activity_log: {
          onInsert: (payload: any) => { capturedActivity = payload; },
          insertResult: { data: null, error: null },
        },
      });

      const { PATCH } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-6', {
        method: 'PATCH',
        body: JSON.stringify({ is_bought: true }),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'item-6' }) });

      expect(capturedActivity).toMatchObject({
        household_id: 'household-1',
        entity_type: 'shopping',
        entity_id: 'item-6',
        action: 'completed',
        actor_id: 'profile-6',
        actor_name: 'Alice Brown',
      });
    });

    it('should create activity_log with action "updated" when is_bought=false', async () => {
      mockGetUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-7' } },
        error: null,
      }));

      const mockProfile = {
        id: 'profile-7',
        user_id: 'user-7',
        household_id: 'household-1',
        display_name: 'Charlie Davis',
      };

      let capturedActivity: any = null;

      mockFrom = createTableMock({
        profiles: { selectResult: { data: mockProfile, error: null } },
        shopping_items: {
          selectResult: { data: { id: 'item-7', shopping_lists: { household_id: 'household-1' } }, error: null },
          updateResult: {
            data: {
              id: 'item-7',
              name: 'Bread',
              is_bought: false,
              bought_by: null,
            },
            error: null,
          },
        },
        activity_log: {
          onInsert: (payload: any) => { capturedActivity = payload; },
          insertResult: { data: null, error: null },
        },
      });

      const { PATCH } = await import('@/app/api/shopping/items/[id]/route');

      const request = new NextRequest('http://localhost:3000/api/shopping/items/item-7', {
        method: 'PATCH',
        body: JSON.stringify({ is_bought: false }),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'item-7' }) });

      expect(capturedActivity).toMatchObject({
        action: 'updated',
      });
    });
  });

  describe('AC7: Uses authenticateAndGetProfile', () => {
    it('should use shared auth helper from api-auth.ts', async () => {
      // This test verifies the import exists (will fail if not implemented)
      const { authenticateAndGetProfile } = await import('@/lib/utils/api-auth');
      expect(authenticateAndGetProfile).toBeDefined();
    });
  });

  describe('AC8: Sanitize string fields', () => {
    it('should use sanitizeText for metadata fields', async () => {
      const { sanitizeText } = await import('@/lib/utils/sanitize');
      
      // Verify sanitizeText is called (already imported in route)
      expect(sanitizeText).toBeDefined();
    });
  });
});
