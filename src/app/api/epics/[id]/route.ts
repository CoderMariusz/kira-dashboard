/**
 * GET/DELETE /api/epics/[id]
 * 
 * Single Epic API endpoints:
 * - GET: Returns epic with nested stories
 * - DELETE: Deletes epic with cascade to stories
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  withAuth, 
  fetchTaskById,
  verifyTaskHouseholdAccess,
  notFound,
  forbidden,
  serverError,
} from '@/lib/utils/api-helpers';

type RouteParams = { id: string };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  if (context.params instanceof Promise) {
    return context.params;
  }
  return context.params;
}

/**
 * GET /api/epics/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id: epicId } = await resolveParams(context);
  
  return withAuth(async ({ profile, supabase }) => {
    const { data: epic, error: epicError } = await fetchTaskById(supabase, epicId, 'epic');

    if (epicError || !epic) {
      return notFound('Epic');
    }

    if (!verifyTaskHouseholdAccess(epic, profile.household_id)) {
      return notFound('Epic');
    }

    const { data: stories } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_id', epicId);

    return NextResponse.json({ epic: { ...epic, stories: stories || [] } });
  })(request);
}

/**
 * DELETE /api/epics/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    await supabase.from('tasks').delete().eq('parent_id', epicId);
    const { error: deleteEpicError } = await supabase.from('tasks').delete().eq('id', epicId);

    if (deleteEpicError) {
      return serverError(deleteEpicError);
    }

    return NextResponse.json({ success: true });
  })(request);
}
