import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function createTableMock(responses: Record<string, any>) {
  return vi.fn((table: string) => {
    const config = responses[table] ?? {};
    
    const chainMethods: any = {};
    
    // select → eq → single chain (for reads)
    chainMethods.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(config.selectResult ?? { data: null, error: null })),
      })),
      single: vi.fn(() => Promise.resolve(config.selectResult ?? { data: null, error: null })),
    }));
    
    // insert → select → single chain (for writes that return data)
    chainMethods.insert = vi.fn((payload: any) => {
      if (config.onInsert) config.onInsert(payload);
      if (config.insertResult !== undefined) {
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(config.insertResult)),
          })),
          then: (resolve: any) => resolve(config.insertResult),
        };
      }
      return {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(config.insertSelectResult ?? { data: null, error: null })),
        })),
      };
    });
    
    return chainMethods;
  });
}

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

const mockGetUser = vi.fn();
let mockFrom: ReturnType<typeof createTableMock>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    get from() { return mockFrom; },
  })),
}));

// ═══════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════

describe('T2: API Route - POST /api/shopping/items', () => {
  let insertedActivityPayload: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    insertedActivityPayload = null;
  });

  it('AC1: should accept valid item data and return created item', async () => {
    const { POST } = await import('@/app/api/shopping/items/route');

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockFrom = createTableMock({
      profiles: {
        selectResult: {
          data: { household_id: 'household-1', id: 'profile-1', display_name: 'User 1' },
          error: null,
        },
      },
      shopping_items: {
        insertSelectResult: {
          data: {
            id: 'item-1', list_id: 'list-1', name: 'Milk', quantity: 1, unit: 'l',
            category_id: 'cat-1', category_name: 'Nabiał', store: null, is_bought: false,
            added_by: 'profile-1', bought_by: null, estimated_price: null, source: 'manual',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          },
          error: null,
        },
      },
      activity_log: {
        insertResult: { data: null, error: null },
      },
    });

    const request = new Request('http://localhost/api/shopping/items', {
      method: 'POST',
      body: JSON.stringify({
        list_id: 'list-1', name: 'Milk', quantity: 1, unit: 'l',
        category_id: 'cat-1', category_name: 'Nabiał',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('item-1');
    expect(data.name).toBe('Milk');
  });

  it('AC2: should return 400 if required fields are missing', async () => {
    const { POST } = await import('@/app/api/shopping/items/route');

    const request = new Request('http://localhost/api/shopping/items', {
      method: 'POST',
      body: JSON.stringify({ quantity: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('AC3: should return 401 if user is not authenticated', async () => {
    const { POST } = await import('@/app/api/shopping/items/route');

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const request = new Request('http://localhost/api/shopping/items', {
      method: 'POST',
      body: JSON.stringify({ list_id: 'list-1', name: 'Milk' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('AC4: should create activity_log entry with correct metadata', async () => {
    const { POST } = await import('@/app/api/shopping/items/route');

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockFrom = createTableMock({
      profiles: {
        selectResult: {
          data: { household_id: 'household-1', id: 'profile-1', display_name: 'User 1' },
          error: null,
        },
      },
      shopping_items: {
        insertSelectResult: {
          data: {
            id: 'item-1', list_id: 'list-1', name: 'Milk', quantity: 1, unit: 'l',
            category_id: 'cat-1', category_name: 'Nabiał', store: null, is_bought: false,
            added_by: 'profile-1', bought_by: null, estimated_price: null, source: 'manual',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          },
          error: null,
        },
      },
      activity_log: {
        onInsert: (payload: any) => { insertedActivityPayload = payload; },
        insertResult: { data: null, error: null },
      },
    });

    const request = new Request('http://localhost/api/shopping/items', {
      method: 'POST',
      body: JSON.stringify({ list_id: 'list-1', name: 'Milk', category_name: 'Nabiał' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);

    expect(insertedActivityPayload).toBeDefined();
    expect(insertedActivityPayload.entity_type).toBe('shopping');
    expect(insertedActivityPayload.action).toBe('created');
    expect(insertedActivityPayload.metadata.item_name).toBe('Milk');
    expect(insertedActivityPayload.metadata.category).toBe('Nabiał');
  });

  it('AC5: should return 500 on database error', async () => {
    const { POST } = await import('@/app/api/shopping/items/route');

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockFrom = createTableMock({
      profiles: {
        selectResult: { data: null, error: new Error('Database error') },
      },
    });

    const request = new Request('http://localhost/api/shopping/items', {
      method: 'POST',
      body: JSON.stringify({ list_id: 'list-1', name: 'Milk' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
