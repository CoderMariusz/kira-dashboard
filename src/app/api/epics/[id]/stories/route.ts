/**
 * GET/POST /api/epics/[id]/stories
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  withAuth, 
  fetchTaskById,
  verifyTaskHouseholdAccess,
  notFound,
  forbidden,
  serverError,
  badRequest,
} from '@/lib/utils/api-helpers';
import { validateCreateTaskBody } from '@/lib/utils/validation';

type RouteParams = { id: string };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  if (context.params instanceof Promise) {
    return context.params;
  }
  return context.params;
}

/**
 * GET /api/epics/[id]/stories
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id: epicId } = await resolveParams(context);
  
  return withAuth(async ({ profile, supabase }) => {
    const { data: epic, error: epicError } = await fetchTaskById(supabase, epicId, 'epic');

    if (epicError || !epic) {
      return notFound('Epic');
    }

    // Security: return 404 (don't reveal resource exists)
    if (!verifyTaskHouseholdAccess(epic, profile.household_id)) {
      return notFound('Epic');
    }

    const { data: stories, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_id', epicId);

    if (error) {
      return serverError(error);
    }

    return NextResponse.json({ stories: stories || [] });
  })(request);
}

/**
 * POST /api/epics/[id]/stories
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: epicId } = await resolveParams(context);
  
  return withAuth(async ({ profile, supabase }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON payload');
    }

    const validation = validateCreateTaskBody(body);
    if (!validation.valid) {
      return badRequest(validation.error || 'Validation failed');
    }

    const { data: epic, error: epicError } = await fetchTaskById(supabase, epicId, 'epic');

    if (epicError || !epic) {
      return notFound('Epic');
    }

    // Security: return 404 (don't reveal resource exists)
    if (!verifyTaskHouseholdAccess(epic, profile.household_id)) {
      return notFound('Epic');
    }

    const storyData = {
      title: body.title.trim(),
      description: body.description || null,
      type: 'story' as const,
      parent_id: epicId,
      household_id: profile.household_id,
      board_id: null,
      column: 'idea' as const,
      priority: 'medium' as const,
      position: 0,
      completed: false,
    };

    const { data: story, error } = await supabase
      .from('tasks')
      .insert(storyData)
      .select()
      .single();

    if (error || !story) {
      return serverError(error);
    }

    return NextResponse.json({ story }, { status: 201 });
  })(request);
}
