/**
 * Test: SET-001 - Active Sessions Loading on /settings/security
 * Tests the active sessions functionality with Device/IP/Location/LastActivity columns
 */

import { render, screen, waitFor } from '@testing-library/react';
import SecuritySettingsPage from '@/app/(dashboard)/settings/security/page';
import { useSessions } from '@/lib/hooks/useSessions';

// Mock the useSessions hook
jest.mock('@/lib/hooks/useSessions');

describe('SET-001: Active Sessions on /settings/security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display loading state initially', () => {
    (useSessions as jest.Mock).mockReturnValue({
      sessions: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    // Should show loading skeletons
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('should fetch and display active sessions', async () => {
    const mockSessions = [
      {
        id: 'session_1',
        device: 'MacBook Pro (13-inch, M2)',
        ip: '192.168.1.100',
        location: 'London, UK',
        lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        isCurrentDevice: true,
      },
      {
        id: 'session_2',
        device: 'iPhone 14 Pro',
        ip: '203.0.113.45',
        location: 'Manchester, UK',
        lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        isCurrentDevice: false,
      },
    ];

    (useSessions as jest.Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      // Verify page title
      expect(screen.getByText('🔒 Security Settings')).toBeInTheDocument();
      expect(screen.getByText('📱 Active Sessions')).toBeInTheDocument();
    });

    // Verify sessions are displayed
    expect(screen.getByText('MacBook Pro (13-inch, M2)')).toBeInTheDocument();
    expect(screen.getByText('iPhone 14 Pro')).toBeInTheDocument();
  });

  test('should display Device column', async () => {
    const mockSessions = [
      {
        id: 'session_1',
        device: 'Chrome on Windows 10',
        ip: '198.51.100.23',
        location: 'London, UK',
        lastActivity: new Date().toISOString(),
        isCurrentDevice: false,
      },
    ];

    (useSessions as jest.Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('DEVICE')).toBeInTheDocument();
      expect(screen.getByText('Chrome on Windows 10')).toBeInTheDocument();
    });
  });

  test('should display IP Address column', async () => {
    const mockSessions = [
      {
        id: 'session_1',
        device: 'MacBook Pro',
        ip: '192.168.1.50',
        location: 'London, UK',
        lastActivity: new Date().toISOString(),
        isCurrentDevice: false,
      },
    ];

    (useSessions as jest.Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('IP ADDRESS')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.50')).toBeInTheDocument();
    });
  });

  test('should display Location column', async () => {
    const mockSessions = [
      {
        id: 'session_1',
        device: 'iPhone 14',
        ip: '203.0.113.45',
        location: 'New York, USA',
        lastActivity: new Date().toISOString(),
        isCurrentDevice: false,
      },
    ];

    (useSessions as jest.Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('LOCATION')).toBeInTheDocument();
      expect(screen.getByText('📍 New York, USA')).toBeInTheDocument();
    });
  });

  test('should display Last Activity column', async () => {
    const mockSessions = [
      {
        id: 'session_1',
        device: 'MacBook Pro',
        ip: '192.168.1.100',
        location: 'London, UK',
        lastActivity: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        isCurrentDevice: false,
      },
    ];

    (useSessions as jest.Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('LAST ACTIVITY')).toBeInTheDocument();
      // Check that time ago format is displayed
      const lastActivityText = screen.getByText(/about \d+ minute/);
      expect(lastActivityText).toBeInTheDocument();
    });
  });

  test('should mark current device', async () => {
    const mockSessions = [
      {
        id: 'session_1',
        device: 'MacBook Pro',
        ip: '192.168.1.100',
        location: 'London, UK',
        lastActivity: new Date().toISOString(),
        isCurrentDevice: true,
      },
    ];

    (useSessions as jest.Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  test('should handle error state', async () => {
    (useSessions as jest.Mock).mockReturnValue({
      sessions: [],
      isLoading: false,
      error: 'Failed to fetch sessions',
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch sessions/)).toBeInTheDocument();
    });
  });

  test('should handle empty sessions list', async () => {
    (useSessions as jest.Mock).mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('No active sessions found.')).toBeInTheDocument();
    });
  });

  test('should display multiple sessions correctly', async () => {
    const mockSessions = [
      {
        id: 'session_1',
        device: 'MacBook Pro M2',
        ip: '192.168.1.100',
        location: 'London, UK',
        lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        isCurrentDevice: true,
      },
      {
        id: 'session_2',
        device: 'iPhone 14 Pro',
        ip: '203.0.113.45',
        location: 'London, UK',
        lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isCurrentDevice: false,
      },
      {
        id: 'session_3',
        device: 'iPad Air',
        ip: '198.51.100.23',
        location: 'Manchester, UK',
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isCurrentDevice: false,
      },
    ];

    (useSessions as jest.Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Pro M2')).toBeInTheDocument();
      expect(screen.getByText('iPhone 14 Pro')).toBeInTheDocument();
      expect(screen.getByText('iPad Air')).toBeInTheDocument();
    });
  });
});
