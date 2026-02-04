import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ShoppingList from '@/components/shopping/ShoppingList';
import { EmptyState } from '@/components/shared/EmptyState';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Shopping list page.
 * 
 * Fetches active shopping list server-side and displays the shopping list component.
 * Shows empty state if no active list exists or on fetch error.
 * 
 * @component
 * @example
 * ```tsx
 * export default ShoppingPage();
 * ```
 */
export default async function ShoppingPage() {
  const supabase = await createClient();
  
  // Fetch active shopping list
  const { data: activeList, error } = await supabase
    .from('shopping_lists')
    .select()
    .eq('is_active', true)
    .single() as { data: { id: string; name: string } | null; error: PostgrestError | null };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">🛒 Shopping List</CardTitle>
          <CardDescription>
            Lista zakupów z kategoriami
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <EmptyState
              icon="⚠️"
              title="Failed to load shopping list"
              description="Please check your connection and try again"
            />
          ) : !activeList ? (
            <EmptyState
              icon="📝"
              title="No active shopping list"
              description="Create a shopping list to get started"
            />
          ) : (
            <ShoppingList listId={activeList.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
