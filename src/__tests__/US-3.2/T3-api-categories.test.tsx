import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function createTableMock(responses: Record<string, any>) {
  return vi.fn((table: string) => {
    const config = responses[table] ?? {};
    
    const chainMethods: any = {};
    
    chainMethods.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(config.selectResult ?? { data: null, error: null })),
      })),
      single: vi.fn(() => Promise.resolve(config.selectResult ?? { data: null, error: null })),
    }));
    
    chainMethods.insert = vi.fn((payload: any) => {
      if (config.onInsert) config.onInsert(payload);
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

describe('T3: API Route - POST /api/shopping/categories', () => {
  let insertedPayload: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    insertedPayload = null;
  });

  it('AC1: should create category with valid data', async () => {
    const { POST } = await import('@/app/api/shopping/categories/route');

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockFrom = createTableMock({
      profiles: {
        selectResult: {
          data: { household_id: 'household-1', id: 'profile-1' },
          error: null,
        },
      },
      shopping_categories: {
        insertSelectResult: {
          data: {
            id: 'cat-new', name: 'New Category', icon: '📦', color: '#6B7280',
            position: 100, is_default: false, created_at: new Date().toISOString(),
          },
          error: null,
        },
      },
    });

    const request = new Request('http://localhost/api/shopping/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Category' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('New Category');
    expect(data.is_default).toBe(false);
  });

  it('AC2: should return 400 if name is missing', async () => {
    const { POST } = await import('@/app/api/shopping/categories/route');

    const request = new Request('http://localhost/api/shopping/categories', {
      method: 'POST',
      body: JSON.stringify({ icon: '📦' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('AC3: should return 401 if user is not authenticated', async () => {
    const { POST } = await import('@/app/api/shopping/categories/route');

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const request = new Request('http://localhost/api/shopping/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Category' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('AC4: should use default icon and color if not provided', async () => {
    const { POST } = await import('@/app/api/shopping/categories/route');

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockFrom = createTableMock({
      profiles: {
        selectResult: {
          data: { household_id: 'household-1', id: 'profile-1' },
          error: null,
        },
      },
      shopping_categories: {
        onInsert: (payload: any) => { insertedPayload = payload; },
        insertSelectResult: {
          data: {
            id: 'cat-new', name: 'New Category', icon: '📦', color: '#6B7280',
            position: 100, is_default: false, created_at: new Date().toISOString(),
          },
          error: null,
        },
      },
    });

    const request = new Request('http://localhost/api/shopping/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Category' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.icon).toBe('📦');
    expect(data.color).toBe('#6B7280');
  });

  it('AC5: should insert category with household_id from profile', async () => {
    const { POST } = await import('@/app/api/shopping/categories/route');

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockFrom = createTableMock({
      profiles: {
        selectResult: {
          data: { household_id: 'household-1', id: 'profile-1' },
          error: null,
        },
      },
      shopping_categories: {
        onInsert: (payload: any) => { insertedPayload = payload; },
        insertSelectResult: {
          data: {
            id: 'cat-new', name: 'New Category', icon: '🎯', color: '#FF5722',
            position: 100, is_default: false, created_at: new Date().toISOString(),
          },
          error: null,
        },
      },
    });

    const request = new Request('http://localhost/api/shopping/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Category', icon: '🎯', color: '#FF5722' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);

    expect(insertedPayload).toBeDefined();
    expect(insertedPayload.name).toBe('New Category');
    expect(insertedPayload.icon).toBe('🎯');
    expect(insertedPayload.color).toBe('#FF5722');
    expect(insertedPayload.position).toBe(100);
    expect(insertedPayload.is_default).toBe(false);
  });
});
