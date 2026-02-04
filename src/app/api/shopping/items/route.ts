import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetProfile } from '@/lib/utils/api-auth';
import { sanitizeText } from '@/lib/utils/sanitize';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

interface AddItemRequestBody {
  list_id: string;
  name: string;
  quantity?: number;
  unit?: string | null;
  category_id?: string | null;
  category_name?: string;
}

interface ShoppingItemInsert {
  list_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category_id: string | null;
  category_name: string;
  added_by: string;
  source: string;
}

interface ActivityLogInsert {
  household_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  metadata: {
    item_name: string;
    category: string;
  };
}

// ══════════════════════════════════════════════════════════
// POST HANDLER
// ══════════════════════════════════════════════════════════

/**
 * POST /api/shopping/items
 * 
 * Creates a new shopping item and logs the activity.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    let body: AddItemRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // 2. Validate required fields
    if (!body.list_id || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: list_id, name' },
        { status: 400 }
      );
    }

    // 3. Authenticate and get profile
    const auth = await authenticateAndGetProfile();
    if (!auth.success) return auth.response;

    const { profile } = auth;
    const supabase = await createClient();

    // 4. Sanitize and prepare item data
    const safeName = sanitizeText(body.name, 200);
    const safeCategoryName = sanitizeText(body.category_name ?? 'Inne', 100);

    const itemData: ShoppingItemInsert = {
      list_id: body.list_id,
      name: safeName,
      quantity: body.quantity ?? 1,
      unit: body.unit ?? null,
      category_id: body.category_id ?? null,
      category_name: safeCategoryName,
      added_by: profile.id,
      source: 'manual',
    };

    // 5. Insert shopping item
    const { data: item, error: itemError } = (await supabase
      .from('shopping_items')
      .insert(itemData as any)
      .select()
      .single()) as { data: { id: string; [key: string]: any } | null; error: any };

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Failed to create item', details: itemError?.message },
        { status: 500 }
      );
    }

    // 6. Prepare and insert activity log
    const activityData: ActivityLogInsert = {
      household_id: profile.household_id,
      entity_type: 'shopping',
      entity_id: item.id,
      action: 'created',
      actor_id: profile.id,
      actor_name: profile.display_name,
      metadata: {
        item_name: safeName,
        category: safeCategoryName,
      },
    };

    await supabase
      .from('activity_log')
      .insert(activityData as any);

    // 7. Return created item
    return NextResponse.json(item, { status: 200 });

  } catch (error) {
    console.error('[API] Error creating shopping item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
