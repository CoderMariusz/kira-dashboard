import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/household/accept/route';
import { NextRequest } from 'next/server';

/**
 * T3: API Route — POST /api/household/accept
 * Tests for invite acceptance API endpoint
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * API route does not exist yet
 */

// ═══════════════════════════════════════════
// Table-aware mock pattern (Lesson 8)
// ═══════════════════════════════════════════

function createTableMock(responses: Record<string, any>) {
  return vi.fn((table: string) => {
    const config = responses[table] ?? {};
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(config.selectResult ?? { data: null, error: null })),
        })),
      })),
      update: vi.fn((payload: any) => {
        if (config.onUpdate) config.onUpdate(payload);
        return {
          eq: vi.fn(() => Promise.resolve(config.updateResult ?? { data: null, error: null })),
        };
      }),
    };
  });
}

// ═══════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════

let mockFrom: ReturnType<typeof createTableMock>;
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    get from() { return mockFrom; },
  })),
}));

// ═══════════════════════════════════════════
// Mock data
// ═══════════════════════════════════════════

const mockUser = {
  id: 'user-1',
  email: 'new@example.com',
};

const mockProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  household_id: null,
  display_name: 'New User',
  avatar_url: null,
  role: 'member',
  created_at: new Date().toISOString(),
};

const mockPendingInvite = {
  id: 'invite-1',
  household_id: 'hh-1',
  email: 'new@example.com',
  invited_by: 'user-2',
  status: 'pending',
  token: 'valid-token-123',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  accepted_at: null,
};

const mockExpiredInvite = {
  id: 'invite-2',
  household_id: 'hh-1',
  email: 'new@example.com',
  invited_by: 'user-2',
  status: 'pending',
  token: 'expired-token',
  expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
  created_at: new Date().toISOString(),
  accepted_at: null,
};

const mockEmailMismatchInvite = {
  id: 'invite-3',
  household_id: 'hh-1',
  email: 'other@example.com', // Different email
  invited_by: 'user-2',
  status: 'pending',
  token: 'token-456',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  accepted_at: null,
};

describe('T3: API Route — POST /api/household/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC3.1: should return 400 if token missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('AC3.2: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'some-token' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('AC3.3: should return 400 if invite not found or not pending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockFrom = createTableMock({
      household_invites: {
        selectResult: { data: null, error: { message: 'Invite not found' } },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('AC3.4: should return 400 if invite expired and mark it as expired', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    let capturedInviteUpdate: any;
    mockFrom = createTableMock({
      household_invites: {
        selectResult: { data: mockExpiredInvite, error: null },
        onUpdate: (payload: any) => { capturedInviteUpdate = payload; },
        updateResult: { data: null, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired-token' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(400);
    // Invite should be marked as expired
    expect(capturedInviteUpdate.status).toBe('expired');
  });

  it('AC3.5: should return 400 if user email does not match invite email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockFrom = createTableMock({
      household_invites: {
        selectResult: { data: mockEmailMismatchInvite, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'token-456' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('AC3.6: should update profile.household_id to invite\'s household_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    let capturedProfileUpdate: any;
    mockFrom = createTableMock({
      household_invites: {
        selectResult: { data: mockPendingInvite, error: null },
        onUpdate: () => ({}),
        updateResult: { data: null, error: null },
      },
      profiles: {
        selectResult: { data: mockProfile, error: null },
        onUpdate: (payload: any) => { capturedProfileUpdate = payload; },
        updateResult: { data: { ...mockProfile, household_id: 'hh-1' }, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token-123' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(capturedProfileUpdate.household_id).toBe('hh-1');
  });

  it('AC3.7: should mark invite as accepted with accepted_at timestamp', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    let capturedInviteUpdate: any;
    mockFrom = createTableMock({
      household_invites: {
        selectResult: { data: mockPendingInvite, error: null },
        onUpdate: (payload: any) => { capturedInviteUpdate = payload; },
        updateResult: { data: null, error: null },
      },
      profiles: {
        selectResult: { data: mockProfile, error: null },
        onUpdate: () => ({}),
        updateResult: { data: { ...mockProfile, household_id: 'hh-1' }, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token-123' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(capturedInviteUpdate.status).toBe('accepted');
    expect(capturedInviteUpdate.accepted_at).toBeDefined();
  });

  it('AC3.8: should return success on valid accept', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockFrom = createTableMock({
      household_invites: {
        selectResult: { data: mockPendingInvite, error: null },
        onUpdate: () => ({}),
        updateResult: { data: null, error: null },
      },
      profiles: {
        selectResult: { data: mockProfile, error: null },
        onUpdate: () => ({}),
        updateResult: { data: { ...mockProfile, household_id: 'hh-1' }, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token-123' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
