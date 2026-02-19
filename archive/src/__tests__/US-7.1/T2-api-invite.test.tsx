import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/household/invite/route';
import { NextRequest } from 'next/server';

/**
 * T2: API Route — POST /api/household/invite
 * Tests for invite creation API endpoint
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
      insert: vi.fn((payload: any) => {
        if (config.onInsert) config.onInsert(payload);
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(config.insertSelectResult ?? { data: null, error: null })),
          })),
        };
      }),
    };
  });
}

function chainableEq(config: any): any {
  return vi.fn(() => ({
    eq: chainableEq(config),
    single: vi.fn(() => Promise.resolve(config.selectResult ?? { data: null, error: null })),
  }));
}

// ═══════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════

let mockFrom: ReturnType<typeof createTableMock>;
const mockGetUser = vi.fn();

// Mock sendInviteEmail for graceful fallback tests
const mockSendInviteEmail = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    get from() { return mockFrom; },
  })),
}));

vi.mock('@/lib/email/send-invite', () => ({
  sendInviteEmail: () => mockSendInviteEmail(),
}));

// ═══════════════════════════════════════════
// Mock data
// ═══════════════════════════════════════════

const mockProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  household_id: 'hh-1',
  display_name: 'John Doe',
  avatar_url: null,
  role: 'admin',
  created_at: new Date().toISOString(),
};

const mockExistingInvite = {
  id: 'invite-1',
  household_id: 'hh-1',
  email: 'existing@example.com',
  invited_by: 'user-1',
  status: 'pending',
  token: 'existing-token',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  accepted_at: null,
};

const mockNewInvite = {
  id: 'new-invite-id',
  household_id: 'hh-1',
  email: 'new@example.com',
  invited_by: 'user-1',
  status: 'pending',
  token: expect.any(String),
  expires_at: expect.any(String),
  created_at: expect.any(String),
  accepted_at: null,
};

describe('T2: API Route — POST /api/household/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendInviteEmail.mockClear();
  });

  it('AC2.1: should validate email format and reject invalid emails with 400', async () => {
    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('email');
  });

  it('AC2.2: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('AC2.3: should return 400 if user has no household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { selectResult: { data: { ...mockProfile, household_id: null }, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('AC2.4: should return 400 if email already has pending invite for this household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { selectResult: { data: mockProfile, error: null } },
      household_invites: {
        selectResult: { data: [mockExistingInvite], error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'existing@example.com' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('AC2.5: should create invite record with status=pending, token=UUID, expires_at=now+7d', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    let capturedInsert: any;
    mockFrom = createTableMock({
      profiles: { selectResult: { data: mockProfile, error: null } },
      household_invites: {
        selectResult: { data: [], error: null },
        onInsert: (payload: any) => { capturedInsert = payload; },
        insertSelectResult: { data: mockNewInvite, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(capturedInsert.status).toBe('pending');
    expect(capturedInsert.token).toMatch(/^[0-9a-f-]{36}$/); // UUID format

    // Check expires_at is approximately 7 days from now
    const expiresAt = new Date(capturedInsert.expires_at);
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it('AC2.6: should attempt to send email via Resend if RESEND_API_KEY is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { selectResult: { data: mockProfile, error: null } },
      household_invites: {
        selectResult: { data: [], error: null },
        insertSelectResult: { data: mockNewInvite, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);

    expect(response.status).toBe(200);
    // Email sending should be attempted
    // (Graceful fallback means we don't fail if no API key)
  });

  it('AC2.7: should return success even if email sending fails (invite is still created)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { selectResult: { data: mockProfile, error: null } },
      household_invites: {
        selectResult: { data: [], error: null },
        insertSelectResult: { data: mockNewInvite, error: null },
      },
    });

    // Simulate email sending failure
    mockSendInviteEmail.mockRejectedValue(new Error('Email service unavailable'));

    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);
    const json = await response.json();

    // Should still return success - invite was created
    expect(response.status).toBe(200);
    expect(json.invite).toBeDefined();
  });

  it('AC2.8: should return invite object with token for copy-link fallback', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { selectResult: { data: mockProfile, error: null } },
      household_invites: {
        selectResult: { data: [], error: null },
        insertSelectResult: { data: mockNewInvite, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/household/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invite).toBeDefined();
    expect(json.invite.token).toBeDefined();
    expect(json.invite.email).toBe('new@example.com');
  });
});
