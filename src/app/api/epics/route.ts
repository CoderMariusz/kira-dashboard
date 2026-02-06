/**
 * GET/POST /api/epics
 * 
 * Epics API endpoints:
 * - GET: List all epics with story count for user's household
 * - POST: Create a new epic for user's household
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/api-helpers';
import { validateCreateTaskBody } from '@/lib/utils/validation';

/**
 * GET /api/epics
 * 
 * Returns list of all epics with story count for user's household.
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ profile, supabase }) => {
    // Fetch all epics
    const { data: allEpics, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('type', 'epic');

    if (error) {
      console.error('[API] Error fetching epics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch epics' },
        { status: 500 }
      );
    }

    // Filter by household and add story counts
    const epics = (allEpics || [])
      .filter((e: any) => e.household_id === profile.household_id)
      .map((epic: any) => ({
        ...epic,
        story_count: 0,
      }));

    // Count stories for each epic
    const { data: stories } = await supabase
      .from('tasks')
      .select('parent_id')
      .eq('type', 'story');

    const storyCounts: Record<string, number> = {};
    (stories || []).forEach((story: any) => {
      storyCounts[story.parent_id] = (storyCounts[story.parent_id] || 0) + 1;
    });

    // Update story counts
    const epicsWithCount = epics.map((epic: any) => ({
      ...epic,
      story_count: storyCounts[epic.id] || 0,
    }));

    return NextResponse.json({ epics: epicsWithCount });
  })(request);
}

/**
 * POST /api/epics
 * 
 * Creates a new epic for the user's household.
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ profile, supabase }) => {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const validation = validateCreateTaskBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Insert epic
    const epicData = {
      title: body.title.trim(),
      description: body.description || null,
      type: 'epic' as const,
      parent_id: null,
      household_id: profile.household_id,
      board_id: null,
      column: 'idea' as const,
      priority: 'medium' as const,
      position: 0,
    };

    const { data: epic, error } = await supabase
      .from('tasks')
      .insert(epicData)
      .select()
      .single();

    if (error || !epic) {
      console.error('[API] Error creating epic:', error);
      return NextResponse.json(
        { error: 'Failed to create epic' },
        { status: 500 }
      );
    }

    return NextResponse.json({ epic }, { status: 201 });
  })(request);
}
