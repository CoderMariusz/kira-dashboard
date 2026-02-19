import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetProfile } from '@/lib/utils/api-auth';
import { sanitizeText, sanitizeColor } from '@/lib/utils/sanitize';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

interface AddCategoryRequestBody {
  name: string;
  icon?: string;
  color?: string;
}

interface ShoppingCategoryInsert {
  name: string;
  icon: string;
  color: string;
  position: number;
  is_default: boolean;
}

// ══════════════════════════════════════════════════════════
// POST HANDLER
// ══════════════════════════════════════════════════════════

/**
 * POST /api/shopping/categories
 * 
 * Creates a new custom shopping category.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    let body: AddCategoryRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // 2. Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // 3. Authenticate and get profile
    const auth = await authenticateAndGetProfile();
    if (!auth.success) return auth.response;

    const supabase = await createClient();

    // 4. Check household
    if (!auth.profile.household_id) {
      return NextResponse.json(
        { error: 'User must belong to a household' },
        { status: 400 }
      );
    }

    // 5. Sanitize and prepare category data
    const categoryData: ShoppingCategoryInsert & { household_id: string } = {
      name: sanitizeText(body.name, 100),
      icon: sanitizeText(body.icon ?? '📦', 2),
      color: sanitizeColor(body.color ?? '#6B7280'),
      position: 100,
      is_default: false,
      household_id: auth.profile.household_id,
    };

    // 6. Insert category
    const { data: category, error: categoryError } = (await supabase
      .from('shopping_categories')
      .insert(categoryData as any)
      .select()
      .single()) as { data: any | null; error: any };

    if (categoryError) {
      return NextResponse.json(
        { error: 'Failed to create category', details: categoryError.message },
        { status: 500 }
      );
    }

    // 7. Return created category
    return NextResponse.json(category, { status: 201 });

  } catch (error) {
    console.error('[API] Error creating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
