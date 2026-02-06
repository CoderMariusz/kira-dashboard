/**
 * PUT /api/tasks/[id]/parent
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

type RouteParams = { id: string };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  if (context.params instanceof Promise) {
    return context.params;
  }
  return context.params;
}

/**
 * PUT /api/tasks/[id]/parent - Move story to different epic
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id: storyId } = await resolveParams(context);
  
  return withAuth(async ({ profile, supabase }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON payload');
    }

    if (!body.parent_id || typeof body.parent_id !== 'string') {
      return badRequest('parent_id is required');
    }

    const newParentId = body.parent_id;

    const { data: story, error: storyError } = await fetchTaskById(supabase, storyId);

    if (storyError || !story) {
      return notFound('Story');
    }

    // Security: return 404 (don't reveal resource exists)
    if (!verifyTaskHouseholdAccess(story, profile.household_id)) {
      return notFound('Story');
    }

    const { data: newParent, error: parentError } = await fetchTaskById(supabase, newParentId, 'epic');

    if (parentError || !newParent) {
      return notFound('Parent epic');
    }

    // Security: return 404 for inaccessible target
    if (!verifyTaskHouseholdAccess(newParent, profile.household_id)) {
      return notFound('Parent epic');
    }

    const { data: updatedStory, error: updateError } = await supabase
      .from('tasks')
      .update({ parent_id: newParentId })
      .eq('id', storyId)
      .select()
      .single();

    if (updateError || !updatedStory) {
      return serverError(updateError);
    }

    return NextResponse.json({ story: updatedStory });
  })(request);
}
