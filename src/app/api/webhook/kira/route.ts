/**
 * Kira Webhook Handler
 * 
 * API endpoint accepting commands from Kira (OpenClaw agent).
 * Uses service role key to bypass RLS — Kira acts as system actor.
 * 
 * Actions: task_create, task_update, task_move, task_delete, task_list,
 *          shopping_add, shopping_buy, shopping_clear, shopping_list,
 *          reminder_create
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/utils/sanitize';


// ══════════════════════════════════════════════════════════
// SUPABASE SERVICE CLIENT (bypasses RLS)
// ══════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = SupabaseClient<any, 'public', any>;

function createServiceClient(): ServiceClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  return createSupabaseClient(url, serviceKey);
}

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

interface KiraWebhookPayload {
  api_key?: string;
  household_id?: string;
  actor?: string;
  action: string;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
  source?: string;
  original_message?: string;
}

interface WebhookResult {
  success: boolean;
  data?: unknown;
  message: string;
  error?: string;
}

// ══════════════════════════════════════════════════════════
// AUTHENTICATION
// ══════════════════════════════════════════════════════════

function verifyApiKey(request: NextRequest, payload: KiraWebhookPayload): boolean {
  const expectedKey = process.env.KIRA_API_KEY?.trim();
  if (!expectedKey) {
    console.error('[Webhook] KIRA_API_KEY not configured');
    return false;
  }

  const bodyKey = payload.api_key;
  const headerKey = request.headers.get('x-api-key') 
    || request.headers.get('authorization')?.replace('Bearer ', '');

  return bodyKey === expectedKey || headerKey === expectedKey;
}

// ══════════════════════════════════════════════════════════
// NOTE: Kira is a system actor — no profile needed.
// profiles.id is FK to auth.users, so we can't create a system profile.
// We use created_by: null + actor_name: 'Kira' in activity logs.
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// ACTION HANDLERS
// ══════════════════════════════════════════════════════════

async function handleTaskCreate(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const title = params.title as string | undefined;
  const board = (params.board as string) || (params.board_type as string) || 'home';
  const column = (params.column as string) || 'idea';
  const priority = (params.priority as string) || 'medium';
  const due_date = params.due_date as string | undefined;
  const description = params.description as string | undefined;
  const labels = params.labels as string[] | undefined;
  const subtasks = params.subtasks as string[] | undefined;
  const assignee = params.assignee as string | undefined;

  if (!title) {
    return { success: false, error: 'Title is required', message: 'Nie podano tytułu zadania' };
  }

  // Get board_id by type
  const { data: boardData } = await supabase
    .from('boards')
    .select('id')
    .eq('household_id', household_id)
    .eq('type', board as 'home' | 'work')
    .maybeSingle();

  if (!boardData) {
    return { success: false, error: 'Board not found', message: `Nie znaleziono tablicy "${board}"` };
  }

  

  // Resolve assignee
  let assigneeId: string | null = null;
  if (assignee) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', household_id)
      .ilike('display_name', assignee)
      .maybeSingle();
    assigneeId = assigneeProfile?.id ?? null;
  }

  const safeTitle = sanitizeText(String(title), 500);
  const safeDescription = description ? sanitizeText(String(description), 2000) : null;

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      board_id: boardData.id,
      title: safeTitle,
      column: column as 'idea' | 'plan' | 'in_progress' | 'done',
      priority: priority as 'low' | 'medium' | 'high' | 'urgent',
      due_date: due_date || null,
      description: safeDescription,
      labels: Array.isArray(labels) ? labels : [],
      subtasks: Array.isArray(subtasks)
        ? subtasks.map((t: string) => ({ title: t, done: false }))
        : [],
      created_by: null,
      assigned_to: assigneeId,
    })
    .select()
    .single();

  if (error) throw new Error(`Task insert failed: ${error.message}`);

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'task' as const,
    entity_id: task.id,
    action: 'created',
    actor_id: null,
    actor_name: 'Kira',
    metadata: { title: safeTitle, board, column, priority },
  });

  const boardLabel = board === 'work' ? 'PRACA' : 'DOM';
  return {
    success: true,
    data: task,
    message: `Dodałam zadanie "${safeTitle}" do tablicy ${boardLabel}`,
  };
}

// ──────────────────────────────────────────────────────────

async function handleShoppingAdd(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const items = params.items as Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    store?: string;
  }> | undefined;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'Items required', message: 'Nie podano produktów do dodania' };
  }

  // Get active shopping list
  let { data: listData } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('household_id', household_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!listData) {
    // Auto-create shopping list
    const { data: newList, error: listError } = await supabase
      .from('shopping_lists')
      .insert({ household_id, name: 'Lista Zakupów', is_active: true })
      .select('id')
      .single();

    if (listError) {
      return { success: false, error: 'No shopping list', message: 'Brak aktywnej listy zakupów i nie udało się jej utworzyć' };
    }
    listData = newList;
  }

  

  // Load categories
  const { data: categories } = await supabase
    .from('shopping_categories')
    .select('id, name');

  const categoryMap = new Map(
    (categories || []).map((c) => [c.name.toLowerCase(), { id: c.id, name: c.name }])
  );

  const insertedItems: Array<{ id: string; name: string; category_id: string | null }> = [];

  for (const item of items) {
    const safeName = sanitizeText(String(item.name), 200);
    const categoryKey = item.category?.toLowerCase() || '';
    const matchedCategory = categoryMap.get(categoryKey);

    const { data: newItem, error } = await supabase
      .from('shopping_items')
      .insert({
        list_id: listData.id,
        name: safeName,
        quantity: item.quantity ?? 1,
        category_id: matchedCategory?.id ?? null,
        store: item.store ?? null,
        is_bought: false,
        added_by: null,
      })
      .select('id, name, category_id')
      .single();

    if (error) {
      console.error(`[Webhook] Error adding item "${safeName}":`, error.message);
      continue;
    }

    insertedItems.push(newItem);
  }

  if (insertedItems.length === 0) {
    return { success: false, error: 'No items inserted', message: 'Nie udało się dodać żadnych produktów' };
  }

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'shopping' as const,
    entity_id: listData.id,
    action: 'created',
    actor_id: null,
    actor_name: 'Kira',
    metadata: {
      items_count: insertedItems.length,
      items: insertedItems.map(i => i.name),
    },
  });

  const itemNames = insertedItems.map(i => i.name).join(', ');
  const count = insertedItems.length;
  const word = count === 1 ? 'produkt' : count < 5 ? 'produkty' : 'produktów';

  return {
    success: true,
    data: insertedItems,
    message: `Dodałam ${count} ${word} do listy: ${itemNames}`,
  };
}

// ──────────────────────────────────────────────────────────

async function handleTaskList(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const board = params.board as string | undefined;
  const column = params.column as string | undefined;

  // Get boards for this household first
  const boardFilter: Record<string, unknown> = { household_id };
  if (board) boardFilter.type = board;

  const { data: boards } = await supabase
    .from('boards')
    .select('id, type')
    .match(boardFilter);

  if (!boards || boards.length === 0) {
    return { success: true, data: [], message: 'Brak tablic w tym household' };
  }

  const boardIds = boards.map(b => b.id);
  const boardTypeMap = new Map(boards.map(b => [b.id, b.type]));

  let query = supabase
    .from('tasks')
    .select('id, title, column, priority, due_date, board_id')
    .in('board_id', boardIds)
    .neq('column', 'done');

  if (column) {
    query = query.eq('column', column);
  }

  const { data: tasks, error } = await query
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Task list query failed: ${error.message}`);

  const taskList = (tasks || []).map((t) => ({
    id: t.id,
    title: t.title,
    board: boardTypeMap.get(t.board_id) || 'unknown',
    column: t.column,
    priority: t.priority,
    due_date: t.due_date,
  }));

  const count = taskList.length;

  if (count === 0) {
    const scope = board ? ` w ${board === 'work' ? 'PRACA' : 'DOM'}` : '';
    return { success: true, data: [], message: `Brak aktywnych zadań${scope}` };
  }

  const word = count === 1 ? 'zadanie' : count < 5 ? 'zadania' : 'zadań';
  let message = `Masz ${count} ${word}`;
  if (board) message += ` w ${board === 'work' ? 'PRACA' : 'DOM'}`;
  message += ':\n';
  message += taskList.slice(0, 5).map((t) => {
    const pri = t.priority === 'urgent' ? '🔴 ' : t.priority === 'high' ? '🟠 ' : '';
    return `• ${pri}${t.title} [${t.column}]`;
  }).join('\n');
  if (count > 5) message += `\n... i ${count - 5} więcej`;

  return { success: true, data: taskList, message };
}

// ──────────────────────────────────────────────────────────

async function handleShoppingList(
  supabase: ServiceClient,
  household_id: string,
  _params: Record<string, unknown>
): Promise<WebhookResult> {
  const { data: listData } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('household_id', household_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!listData) {
    return { success: true, data: { items: [] }, message: 'Brak aktywnej listy zakupów' };
  }

  // Join with categories to get names
  const { data: items, error } = await supabase
    .from('shopping_items')
    .select('id, name, quantity, store, is_bought, category_id, shopping_categories(name)')
    .eq('list_id', listData.id)
    .eq('is_bought', false)
    .order('category_id');

  if (error) throw new Error(`Shopping list query failed: ${error.message}`);

  const itemList = items || [];

  if (itemList.length === 0) {
    return { success: true, data: { items: [] }, message: 'Lista zakupów jest pusta 🎉' };
  }

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const item of itemList) {
    const cat = (item as any).shopping_categories?.name || 'Inne';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...item, category_name: cat });
  }

  let message = `Na liście jest ${itemList.length} ${itemList.length === 1 ? 'produkt' : 'produktów'}:\n`;
  for (const [category, catItems] of Object.entries(grouped)) {
    message += `\n📦 ${category}:\n`;
    message += catItems.map((i: any) => {
      const qty = i.quantity > 1 ? `${i.quantity}x ` : '';
      return `• ${qty}${i.name}`;
    }).join('\n');
  }

  return { success: true, data: { items: itemList, grouped }, message };
}

// ──────────────────────────────────────────────────────────
// TASK UPDATE
// ──────────────────────────────────────────────────────────

async function handleTaskUpdate(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const taskId = params.task_id as string | undefined;
  const taskTitle = params.title as string | undefined;
  const updates = (params.updates || {}) as Record<string, unknown>;

  if (!taskId && !taskTitle) {
    return { success: false, error: 'task_id or title required', message: 'Nie podano zadania do aktualizacji' };
  }

  // Find the task
  let task;
  if (taskId) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, board_id, boards!inner(household_id)')
      .eq('id', taskId)
      .single();
    task = data;
  } else {
    // Search by title within household boards
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('household_id', household_id);
    
    if (!boards || boards.length === 0) {
      return { success: false, error: 'No boards', message: 'Brak tablic w tym household' };
    }

    const { data } = await supabase
      .from('tasks')
      .select('id, title, board_id')
      .in('board_id', boards.map(b => b.id))
      .ilike('title', `%${taskTitle}%`)
      .limit(1)
      .maybeSingle();
    task = data;
  }

  if (!task) {
    return { success: false, error: 'Task not found', message: `Nie znalazłam zadania "${taskTitle || taskId}"` };
  }

  // Build update object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (updates.title) updateData.title = sanitizeText(String(updates.title), 500);
  if (updates.description !== undefined) updateData.description = updates.description ? sanitizeText(String(updates.description), 2000) : null;
  if (updates.priority) updateData.priority = updates.priority;
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date || null;
  if (updates.labels) updateData.labels = updates.labels;
  if (updates.column) {
    updateData.column = updates.column;
    if (updates.column === 'done') updateData.completed_at = new Date().toISOString();
  }

  // Resolve assignee by name
  if (updates.assignee !== undefined) {
    if (updates.assignee) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('household_id', household_id)
        .ilike('display_name', String(updates.assignee))
        .maybeSingle();
      updateData.assigned_to = profile?.id ?? null;
    } else {
      updateData.assigned_to = null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: 'No updates provided', message: 'Nie podano co zmienić' };
  }

  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw new Error(`Task update failed: ${error.message}`);

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'task' as const,
    entity_id: task.id,
    action: 'updated',
    actor_id: null,
    actor_name: 'Kira',
    metadata: { title: task.title, changes: Object.keys(updateData) },
  });

  const changedFields = Object.keys(updateData).join(', ');
  return {
    success: true,
    data: updatedTask,
    message: `Zaktualizowałam zadanie "${task.title}" (${changedFields})`,
  };
}

// ──────────────────────────────────────────────────────────
// TASK MOVE (change column)
// ──────────────────────────────────────────────────────────

async function handleTaskMove(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const taskId = params.task_id as string | undefined;
  const taskTitle = params.title as string | undefined;
  const targetColumn = params.column as string | undefined;

  if (!taskId && !taskTitle) {
    return { success: false, error: 'task_id or title required', message: 'Nie podano zadania do przeniesienia' };
  }
  if (!targetColumn) {
    return { success: false, error: 'column required', message: 'Nie podano docelowej kolumny' };
  }

  const validColumns = ['idea', 'plan', 'in_progress', 'done'];
  if (!validColumns.includes(targetColumn)) {
    return { success: false, error: 'Invalid column', message: `Nieprawidłowa kolumna "${targetColumn}". Dostępne: ${validColumns.join(', ')}` };
  }

  // Find the task
  let task;
  if (taskId) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, column, board_id')
      .eq('id', taskId)
      .single();
    task = data;
  } else {
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('household_id', household_id);
    
    if (!boards || boards.length === 0) {
      return { success: false, error: 'No boards', message: 'Brak tablic' };
    }

    const { data } = await supabase
      .from('tasks')
      .select('id, title, column, board_id')
      .in('board_id', boards.map(b => b.id))
      .ilike('title', `%${taskTitle}%`)
      .neq('column', 'done')
      .limit(1)
      .maybeSingle();
    task = data;
  }

  if (!task) {
    return { success: false, error: 'Task not found', message: `Nie znalazłam zadania "${taskTitle || taskId}"` };
  }

  if (task.column === targetColumn) {
    return { success: true, data: task, message: `Zadanie "${task.title}" jest już w kolumnie ${targetColumn}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { column: targetColumn };
  if (targetColumn === 'done') updateData.completed_at = new Date().toISOString();

  const { data: movedTask, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw new Error(`Task move failed: ${error.message}`);

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'task' as const,
    entity_id: task.id,
    action: 'moved',
    actor_id: null,
    actor_name: 'Kira',
    metadata: { title: task.title, from: task.column, to: targetColumn },
  });

  const columnLabels: Record<string, string> = {
    idea: 'Pomysły', plan: 'Plan', in_progress: 'W realizacji', done: 'Zrobione ✅',
  };

  return {
    success: true,
    data: movedTask,
    message: `Przeniosłam "${task.title}" do ${columnLabels[targetColumn] || targetColumn}`,
  };
}

// ──────────────────────────────────────────────────────────
// TASK DELETE
// ──────────────────────────────────────────────────────────

async function handleTaskDelete(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const taskId = params.task_id as string | undefined;
  const taskTitle = params.title as string | undefined;

  if (!taskId && !taskTitle) {
    return { success: false, error: 'task_id or title required', message: 'Nie podano zadania do usunięcia' };
  }

  // Find the task
  let task;
  if (taskId) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, board_id')
      .eq('id', taskId)
      .single();
    task = data;
  } else {
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('household_id', household_id);
    
    if (!boards || boards.length === 0) {
      return { success: false, error: 'No boards', message: 'Brak tablic' };
    }

    const { data } = await supabase
      .from('tasks')
      .select('id, title, board_id')
      .in('board_id', boards.map(b => b.id))
      .ilike('title', `%${taskTitle}%`)
      .limit(1)
      .maybeSingle();
    task = data;
  }

  if (!task) {
    return { success: false, error: 'Task not found', message: `Nie znalazłam zadania "${taskTitle || taskId}"` };
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', task.id);

  if (error) throw new Error(`Task delete failed: ${error.message}`);

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'task' as const,
    entity_id: task.id,
    action: 'deleted',
    actor_id: null,
    actor_name: 'Kira',
    metadata: { title: task.title },
  });

  return {
    success: true,
    data: { id: task.id, title: task.title },
    message: `Usunęłam zadanie "${task.title}"`,
  };
}

// ──────────────────────────────────────────────────────────
// SHOPPING BUY (mark items as bought)
// ──────────────────────────────────────────────────────────

async function handleShoppingBuy(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const itemNames = params.items as string[] | undefined;
  const itemIds = params.item_ids as string[] | undefined;

  if ((!itemNames || itemNames.length === 0) && (!itemIds || itemIds.length === 0)) {
    return { success: false, error: 'items or item_ids required', message: 'Nie podano produktów do oznaczenia' };
  }

  // Get active shopping list
  const { data: listData } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('household_id', household_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!listData) {
    return { success: false, error: 'No shopping list', message: 'Brak aktywnej listy zakupów' };
  }

  const boughtItems: string[] = [];

  // Mark by IDs
  if (itemIds && itemIds.length > 0) {
    const { data: updated, error } = await supabase
      .from('shopping_items')
      .update({ is_bought: true })
      .eq('list_id', listData.id)
      .in('id', itemIds)
      .eq('is_bought', false)
      .select('id, name');

    if (error) throw new Error(`Shopping buy failed: ${error.message}`);
    boughtItems.push(...(updated || []).map(i => i.name));
  }

  // Mark by names (fuzzy match)
  if (itemNames && itemNames.length > 0) {
    for (const name of itemNames) {
      const safeName = sanitizeText(String(name), 200);
      const { data: items } = await supabase
        .from('shopping_items')
        .select('id, name')
        .eq('list_id', listData.id)
        .eq('is_bought', false)
        .ilike('name', `%${safeName}%`);

      if (items && items.length > 0) {
        const ids = items.map(i => i.id);
        await supabase
          .from('shopping_items')
          .update({ is_bought: true })
          .in('id', ids);
        boughtItems.push(...items.map(i => i.name));
      }
    }
  }

  if (boughtItems.length === 0) {
    return { success: false, error: 'No items matched', message: 'Nie znalazłam tych produktów na liście' };
  }

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'shopping' as const,
    entity_id: listData.id,
    action: 'bought',
    actor_id: null,
    actor_name: 'Kira',
    metadata: { items: boughtItems, count: boughtItems.length },
  });

  const count = boughtItems.length;
  const word = count === 1 ? 'produkt' : count < 5 ? 'produkty' : 'produktów';
  return {
    success: true,
    data: { bought: boughtItems },
    message: `Oznaczyłam ${count} ${word} jako kupione: ${boughtItems.join(', ')} ✅`,
  };
}

// ──────────────────────────────────────────────────────────
// SHOPPING CLEAR (remove bought items)
// ──────────────────────────────────────────────────────────

async function handleShoppingClear(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const clearAll = params.all === true;

  const { data: listData } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('household_id', household_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!listData) {
    return { success: false, error: 'No shopping list', message: 'Brak aktywnej listy zakupów' };
  }

  let query = supabase
    .from('shopping_items')
    .delete()
    .eq('list_id', listData.id);

  if (!clearAll) {
    query = query.eq('is_bought', true);
  }

  const { data: deleted, error } = await query.select('id, name');

  if (error) throw new Error(`Shopping clear failed: ${error.message}`);

  const count = deleted?.length || 0;

  if (count === 0) {
    return { success: true, data: { cleared: 0 }, message: clearAll ? 'Lista jest już pusta' : 'Brak kupionych produktów do wyczyszczenia' };
  }

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'shopping' as const,
    entity_id: listData.id,
    action: 'cleared',
    actor_id: null,
    actor_name: 'Kira',
    metadata: { cleared: count, all: clearAll },
  });

  const label = clearAll ? 'całą listę' : 'kupione produkty';
  return {
    success: true,
    data: { cleared: count },
    message: `Wyczyściłam ${label} (${count} pozycji) 🧹`,
  };
}

// ──────────────────────────────────────────────────────────
// REMINDER CREATE
// ──────────────────────────────────────────────────────────

async function handleReminderCreate(
  supabase: ServiceClient,
  household_id: string,
  params: Record<string, unknown>
): Promise<WebhookResult> {
  const taskId = params.task_id as string | undefined;
  const taskTitle = params.task_title as string | undefined;
  const remindAt = params.remind_at as string | undefined;
  const channel = (params.channel as string) || 'push';
  const userId = params.user_id as string | undefined;

  if (!remindAt) {
    return { success: false, error: 'remind_at required', message: 'Nie podano czasu przypomnienia' };
  }

  // Validate remind_at is a valid date
  const remindDate = new Date(remindAt);
  if (isNaN(remindDate.getTime())) {
    return { success: false, error: 'Invalid date', message: 'Nieprawidłowy format daty przypomnienia' };
  }

  // Find task if specified
  let resolvedTaskId: string | null = null;
  let taskName = '';
  if (taskId) {
    resolvedTaskId = taskId;
    const { data } = await supabase.from('tasks').select('title').eq('id', taskId).single();
    taskName = data?.title || taskId;
  } else if (taskTitle) {
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('household_id', household_id);
    
    if (boards && boards.length > 0) {
      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .in('board_id', boards.map(b => b.id))
        .ilike('title', `%${taskTitle}%`)
        .limit(1)
        .maybeSingle();
      if (data) {
        resolvedTaskId = data.id;
        taskName = data.title;
      }
    }
  }

  // Resolve user
  let resolvedUserId: string | null = null;
  if (userId) {
    resolvedUserId = userId;
  } else {
    // Default: first profile in household
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', household_id)
      .limit(1)
      .maybeSingle();
    resolvedUserId = profile?.id ?? null;
  }

  const validChannels = ['push', 'whatsapp', 'telegram', 'email'];
  const safeChannel = validChannels.includes(channel) ? channel : 'push';

  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      task_id: resolvedTaskId,
      remind_at: remindDate.toISOString(),
      sent: false,
      channel: safeChannel,
      user_id: resolvedUserId,
    })
    .select()
    .single();

  if (error) throw new Error(`Reminder create failed: ${error.message}`);

  // Activity log
  await supabase.from('activity_log').insert({
    household_id,
    entity_type: 'reminder' as const,
    entity_id: reminder.id,
    action: 'created',
    actor_id: null,
    actor_name: 'Kira',
    metadata: { task: taskName || null, remind_at: remindDate.toISOString(), channel: safeChannel },
  });

  const dateStr = remindDate.toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const taskLabel = taskName ? ` o "${taskName}"` : '';
  return {
    success: true,
    data: reminder,
    message: `Ustawiłam przypomnienie${taskLabel} na ${dateStr} (${safeChannel}) ⏰`,
  };
}

// ══════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ══════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let payload: KiraWebhookPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // 2. Auth (body api_key OR header X-API-Key)
    if (!verifyApiKey(request, payload)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing API key' }, { status: 401 });
    }

    // 3. Normalize (support both new and legacy format)
    const action = payload.action;
    const params = (payload.params || payload.data || {}) as Record<string, unknown>;
    const household_id = payload.household_id || (params.household_id as string);

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }
    if (!household_id) {
      return NextResponse.json({ success: false, error: 'Missing household_id' }, { status: 400 });
    }

    // 4. Service client
    const supabase = createServiceClient();

    // 5. Route
    let result: WebhookResult;
    switch (action) {
      case 'task_create':
      case 'create_task':
        result = await handleTaskCreate(supabase, household_id, params);
        break;
      case 'shopping_add':
      case 'create_shopping_item':
        result = await handleShoppingAdd(supabase, household_id, params);
        break;
      case 'task_list':
      case 'list_tasks':
        result = await handleTaskList(supabase, household_id, params);
        break;
      case 'shopping_list':
        result = await handleShoppingList(supabase, household_id, params);
        break;
      case 'task_update':
      case 'update_task':
        result = await handleTaskUpdate(supabase, household_id, params);
        break;
      case 'task_move':
      case 'move_task':
        result = await handleTaskMove(supabase, household_id, params);
        break;
      case 'task_delete':
      case 'delete_task':
        result = await handleTaskDelete(supabase, household_id, params);
        break;
      case 'shopping_buy':
      case 'buy_items':
        result = await handleShoppingBuy(supabase, household_id, params);
        break;
      case 'shopping_clear':
      case 'clear_shopping':
        result = await handleShoppingClear(supabase, household_id, params);
        break;
      case 'reminder_create':
      case 'create_reminder':
        result = await handleReminderCreate(supabase, household_id, params);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    console.log('[Webhook]', action, result.success ? '✅' : '❌', result.message);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/** GET /api/webhook/kira — Health check */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'kira-webhook',
    version: '1.0.0',
    actions: [
      'task_create', 'task_update', 'task_move', 'task_delete', 'task_list',
      'shopping_add', 'shopping_buy', 'shopping_clear', 'shopping_list',
      'reminder_create',
    ],
    timestamp: new Date().toISOString(),
  });
}
