/**
 * Active Sessions API
 * GET /api/sessions - Fetch all active sessions for current user
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface ActiveSession {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActivity: string;
  isCurrentDevice: boolean;
}

// Mock function to get sessions - in production this would query a sessions table
function generateMockSessions(): ActiveSession[] {
  return [
    {
      id: 'session_1',
      device: 'Mariusz MacBook Pro (13-inch, M2, 2023)',
      ip: '192.168.1.100',
      location: 'London, UK',
      lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      isCurrentDevice: true,
    },
    {
      id: 'session_2',
      device: 'iPhone 14 Pro',
      ip: '203.0.113.45',
      location: 'London, UK',
      lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      isCurrentDevice: false,
    },
    {
      id: 'session_3',
      device: 'Chrome on Windows 10',
      ip: '198.51.100.23',
      location: 'Manchester, UK',
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      isCurrentDevice: false,
    },
  ];
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return mock sessions for now
    // In a real implementation, this would query from a sessions table
    const sessions = generateMockSessions();

    return NextResponse.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: String(error) },
      { status: 500 }
    );
  }
}
