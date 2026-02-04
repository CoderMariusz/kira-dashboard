import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetProfile } from '@/lib/utils/api-auth';
import { sanitizeText } from '@/lib/utils/sanitize';
import { badRequest, notFound, serverError, success } from '@/lib/utils/api-errors';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

/** Update payload for shopping item bought status */
interface ShoppingItemUpdate {
  is_bought: boolean;
  bought_by: string | null;
}

/** Shopping item database row */
interface ShoppingItemRow {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category_name: string;
  is_bought: boolean;
  bought_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Shopping list database row (for ownership verification) */
interface ShoppingListRow {
  household_id: string;
}

/** Activity log entry for audit trail */
interface ActivityLogEntry {
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
// HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Verifies item exists and belongs to the user's household.
 * 
 * Prevents IDOR attacks by joining shopping_items with shopping_lists
 * to verify the item's list belongs to the user's household.
 * 
 * @param supabase - Supabase client instance
 * @param itemId - Item ID to verify
 * @param householdId - User's household ID
 * @returns Object with item data or error message
 */
async function verifyItemOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  householdId: string,
): Promise<{ item: ShoppingItemRow | null; error: string | null }> {
  // Fetch item with its list's household_id to verify ownership
  const { data, error } = (await (supabase as any)
    .from('shopping_items')
    .select('*, shopping_lists!inner(household_id)')
    .eq('id', itemId)
    .eq('shopping_lists.household_id', householdId)
    .single()) as { data: (ShoppingItemRow & { shopping_lists: ShoppingListRow }) | null; error: { message: string } | null };

  if (error || !data) {
    return { item: null, error: 'Item not found or access denied' };
  }

  // Strip the join data, return clean item
  const { shopping_lists: _, ...item } = data;
  return { item: item as ShoppingItemRow, error: null };
}

// ══════════════════════════════════════════════════════════
// PATCH HANDLER
// ══════════════════════════════════════════════════════════

/**
 * PATCH /api/shopping/items/[id]
 * 
 * Toggles item's bought status and logs activity.
 * Sets bought_by when marking as bought, clears when unmarking.
 * 
 * @param request - HTTP request with JSON body: { is_bought: boolean }
 * @param params - Route params including item id
 * @returns Updated item on success, error response otherwise
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON payload');
    }

    // Runtime validation (Zod-lite — simple boolean check)
    if (
      typeof body !== 'object' ||
      body === null ||
      !('is_bought' in body) ||
      typeof (body as Record<string, unknown>).is_bought !== 'boolean'
    ) {
      return badRequest('is_bought must be a boolean');
    }

    const isBought = (body as { is_bought: boolean }).is_bought;

    // 2. Authenticate and get profile
    const auth = await authenticateAndGetProfile();
    if (!auth.success) return auth.response;

    const { profile } = auth;
    const supabase = await createClient();

    // 3. Verify item ownership (IDOR prevention)
    const ownership = await verifyItemOwnership(supabase, id, profile.household_id);
    if (ownership.error) {
      return notFound(ownership.error);
    }

    // 4. Update item
    const updateData: ShoppingItemUpdate = {
      is_bought: isBought,
      bought_by: isBought ? profile.id : null,
    };

    const { data: item, error: itemError } = (await (supabase as any)
      .from('shopping_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()) as { data: ShoppingItemRow | null; error: { message: string } | null };

    if (itemError || !item) {
      return serverError('Failed to update item', itemError?.message);
    }

    // 5. Create activity log
    const activityData: ActivityLogEntry = {
      household_id: profile.household_id,
      entity_type: 'shopping',
      entity_id: item.id,
      action: isBought ? 'completed' : 'updated',
      actor_id: profile.id,
      actor_name: profile.display_name,
      metadata: {
        item_name: sanitizeText(item.name, 200),
        category: sanitizeText(item.category_name ?? 'Inne', 100),
      },
    };

    await supabase
      .from('activity_log')
      .insert(activityData as any);

    // 6. Return updated item
    return success(item);

  } catch (error) {
    console.error('[API] Error updating shopping item:', error);
    return serverError('Internal server error');
  }
}

// ══════════════════════════════════════════════════════════
// DELETE HANDLER
// ══════════════════════════════════════════════════════════

/**
 * DELETE /api/shopping/items/[id]
 * 
 * Deletes a shopping item after ownership verification.
 * 
 * @param request - HTTP request
 * @param params - Route params including item id
 * @returns Success object on success, error response otherwise
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate
    const auth = await authenticateAndGetProfile();
    if (!auth.success) return auth.response;

    const { profile } = auth;
    const supabase = await createClient();

    // 2. Verify item ownership (IDOR prevention)
    const ownership = await verifyItemOwnership(supabase, id, profile.household_id);
    if (ownership.error) {
      return notFound(ownership.error);
    }

    // 3. Delete item
    const { error: deleteError } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return serverError('Failed to delete item', deleteError.message);
    }

    // 4. Return success
    return success({ success: true });

  } catch (error) {
    console.error('[API] Error deleting shopping item:', error);
    return serverError('Internal server error');
  }
}
