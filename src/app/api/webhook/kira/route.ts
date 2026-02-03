/**
 * Kira Webhook Handler
 * Next.js API Route for receiving commands from Kira (OpenClaw agent)
 * 
 * Phase 4 Implementation - Currently a placeholder stub
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

interface WebhookPayload {
  action: 'create_task' | 'create_shopping_item' | 'update_task' | 'delete_task' | 'list_tasks';
  data?: {
    title?: string;
    description?: string;
    board_type?: 'home' | 'work';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignee_name?: string;
    due_date?: string;
    // Shopping
    item_name?: string;
    quantity?: number;
    category?: string;
    // Generic
    task_id?: string;
    household_id?: string;
  };
  source?: string; // 'kira', 'whatsapp', 'telegram'
  original_message?: string;
}

// ══════════════════════════════════════════════════════════
// AUTHENTICATION
// ══════════════════════════════════════════════════════════

/**
 * Verify API key from request headers
 */
async function verifyApiKey(request: NextRequest): Promise<boolean> {
  const headersList = await headers();
  const apiKey = headersList.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  const expectedKey = process.env.KIRA_API_KEY;

  if (!expectedKey) {
    console.error('[Webhook] KIRA_API_KEY not configured in environment');
    return false;
  }

  return apiKey === expectedKey;
}

// ══════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════

/**
 * POST /api/webhook/kira
 * 
 * Accepts commands from Kira agent and performs actions on the dashboard
 * 
 * @example
 * ```bash
 * curl -X POST https://kira-dashboard.vercel.app/api/webhook/kira \
 *   -H "X-API-Key: your-secret-key" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "action": "create_task",
 *     "data": {
 *       "title": "Kupić mleko",
 *       "board_type": "home",
 *       "priority": "high"
 *     },
 *     "source": "whatsapp",
 *     "original_message": "Dodaj zadanie: kupić mleko, priorytet wysoki"
 *   }'
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const isAuthenticated = await verifyApiKey(request);

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let payload: WebhookPayload;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // 3. Validate payload
    if (!payload.action) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required field: action' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════
    // PHASE 4 IMPLEMENTATION PLACEHOLDER
    // ══════════════════════════════════════════════════════════
    // 
    // TODO: Implement actual action handlers:
    // 
    // switch (payload.action) {
    //   case 'create_task':
    //     return await handleCreateTask(payload.data);
    //   case 'create_shopping_item':
    //     return await handleCreateShoppingItem(payload.data);
    //   case 'update_task':
    //     return await handleUpdateTask(payload.data);
    //   case 'delete_task':
    //     return await handleDeleteTask(payload.data);
    //   case 'list_tasks':
    //     return await handleListTasks(payload.data);
    //   default:
    //     return NextResponse.json(
    //       { error: 'Bad Request', message: `Unknown action: ${payload.action}` },
    //       { status: 400 }
    //     );
    // }

    // 4. Log webhook for debugging (Phase 4: store in activity_log)
    console.log('[Webhook] Received:', {
      action: payload.action,
      source: payload.source,
      timestamp: new Date().toISOString(),
    });

    // 5. Return success response (stub)
    return NextResponse.json({
      success: true,
      message: 'Webhook received successfully',
      action: payload.action,
      note: 'Phase 4: Full implementation pending',
      received_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhook/kira
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'kira-webhook',
    version: '0.1.0',
    phase: 'Phase 1 - Stub Implementation',
    timestamp: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════
// FUTURE IMPLEMENTATION (Phase 4)
// ══════════════════════════════════════════════════════════

/*
async function handleCreateTask(data: WebhookPayload['data']) {
  const supabase = createClient();
  
  // 1. Resolve household_id from household name or default
  // 2. Resolve assignee_id from assignee_name
  // 3. Parse due_date
  // 4. Create task in database
  // 5. Log activity
  // 6. Return task data
}

async function handleCreateShoppingItem(data: WebhookPayload['data']) {
  // Similar to handleCreateTask
}

async function handleUpdateTask(data: WebhookPayload['data']) {
  // Update existing task by ID
}

async function handleDeleteTask(data: WebhookPayload['data']) {
  // Soft delete or hard delete task
}

async function handleListTasks(data: WebhookPayload['data']) {
  // Query tasks and return filtered list
}
*/
