'use client';

import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CheckCircle, Plus, Trash, ShoppingCart, Bell, Edit, LayoutGrid } from 'lucide-react';
import type { ActivityLog } from '@/lib/types/database';
import { Skeleton } from '@/components/ui/skeleton';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ActivityItemProps {
  activity: ActivityLog;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function formatRelativeTime(date: string): string {
  const now = new Date();
  const activityDate = new Date(date);
  const diffInMs = now.getTime() - activityDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  // If less than 1 minute ago
  if (diffInMinutes < 1) {
    return 'Przed chwilą';
  }

  // If less than 60 minutes ago, show minutes
  if (diffInMinutes < 60) {
    // Polish pluralization for minutes
    if (diffInMinutes === 1) return '1 minutę temu';
    if (diffInMinutes >= 2 && diffInMinutes <= 4) return `${diffInMinutes} minuty temu`;
    return `${diffInMinutes} minut temu`;
  }

  // If less than 24 hours ago, show hours
  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    // Polish pluralization for hours
    if (hours === 1) return '1 godzinę temu';
    if (hours >= 2 && hours <= 4) return `${hours} godziny temu`;
    return `${hours} godzin temu`;
  }

  // If yesterday (between 24 and 48 hours ago)
  if (diffInDays >= 1 && diffInDays < 2) {
    const hours = activityDate.getHours().toString().padStart(2, '0');
    const minutes = activityDate.getMinutes().toString().padStart(2, '0');
    return `Wczoraj o ${hours}:${minutes}`;
  }

  // For older dates, return formatted date
  return activityDate.toLocaleDateString('pl-PL');
}

// Overloaded version for tests that need time
function formatRelativeTimeWithTime(date: string, includeTime: boolean): string {
  if (!includeTime) {
    return formatRelativeTime(date);
  }
  
  const now = new Date();
  const activityDate = new Date(date);
  const diffInHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  // If yesterday (between 24 and 48 hours ago)
  if (diffInDays >= 1 && diffInDays < 2) {
    const hours = activityDate.getHours().toString().padStart(2, '0');
    const minutes = activityDate.getMinutes().toString().padStart(2, '0');
    return `Wczoraj o ${hours}:${minutes}`;
  }

  return formatRelativeTime(date);
}

function getEntityIcon(entityType: string): string {
  switch (entityType) {
    case 'task':
      return '📋';
    case 'shopping':
      return '🛒';
    case 'reminder':
      return '🔔';
    case 'board':
      return '📊';
    default:
      return '📋';
  }
}

function getActionIcon(entityType: string, action: string): React.ReactNode {
  if (entityType === 'task') {
    if (action === 'created') return <Plus className="w-4 h-4" />;
    if (action === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (action === 'deleted') return <Trash className="w-4 h-4" />;
    if (action === 'updated') return <Edit className="w-4 h-4" />;
  }
  if (entityType === 'shopping') {
    return <ShoppingCart className="w-4 h-4" />;
  }
  if (entityType === 'reminder') {
    return <Bell className="w-4 h-4" />;
  }
  if (entityType === 'board') {
    return <LayoutGrid className="w-4 h-4" />;
  }
  return null;
}

function getActionMessage(activity: ActivityLog): string {
  const { entity_type, action } = activity;
  const metadata = activity.metadata as Record<string, any> | null;

  switch (entity_type) {
    case 'task':
      if (action === 'created') return 'stworzył/a zadanie';
      if (action === 'updated') return 'zaktualizował/a zadanie';
      if (action === 'completed') return 'ukończył/a zadanie';
      if (action === 'deleted') return 'usunął/ęła zadanie';
      break;
    case 'shopping':
      if (action === 'created') {
        const count = metadata?.count || 0;
        // Polish pluralization
        if (count === 1) return 'dodał/a 1 produkt do listy zakupów';
        if (count >= 2 && count <= 4) return `dodał/a ${count} produkty do listy zakupów`;
        return `dodał/a ${count} produktów do listy zakupów`;
      }
      if (action === 'completed') return 'kupił/a';
      if (action === 'deleted') return 'usunął/ęła';
      break;
    case 'reminder':
      if (action === 'sent') return 'wysłano przypomnienie:';
      break;
    case 'board':
      if (action === 'created') return 'stworzył/a tablicę';
      break;
  }

  return `${action} ${entity_type}`;
}

function getMetadataValue(activity: ActivityLog): string | null {
  const { entity_type, action } = activity;
  const metadata = activity.metadata as Record<string, any> | null;

  if (!metadata) return null;

  switch (entity_type) {
    case 'task':
      return metadata.title || null;
    case 'shopping':
      if (action === 'completed' || action === 'deleted') {
        return metadata.item || null;
      }
      return null;
    case 'reminder':
      return metadata.task_title || null;
    case 'board':
      return metadata.name || null;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityAvatar
// ═══════════════════════════════════════════════════════════

interface ActivityAvatarProps {
  actorName: string;
  actorId: string | null;
}

function ActivityAvatar({ actorName, actorId }: ActivityAvatarProps) {
  const isKira = !actorId || actorName === 'Kira';
  const displayName = actorName || 'Kira';

  if (isKira) {
    return (
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e9d5ff'/%3E%3Ctext x='50' y='65' font-size='50' text-anchor='middle'%3E🤖%3C/text%3E%3C/svg%3E"
        alt={displayName}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }

  // Get initials from name
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate SVG with initials
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23dbeafe'/><text x='50' y='65' font-size='40' text-anchor='middle' fill='%232563eb' font-family='sans-serif' font-weight='500'>${initials}</text></svg>`
  );

  return (
    <img
      src={`data:image/svg+xml,${svg}`}
      alt={displayName}
      className="w-10 h-10 rounded-full object-cover"
    />
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityItem
// ═══════════════════════════════════════════════════════════

export function ActivityItem({ activity }: ActivityItemProps) {
  const actionMessage = getActionMessage(activity);
  const metadataValue = getMetadataValue(activity);
  const entityIcon = getEntityIcon(activity.entity_type);
  const timeAgo = formatRelativeTime(activity.created_at);

  // Get shopping items for display
  const meta = activity.metadata as Record<string, any> | null;
  const shoppingItems = meta?.items as string[] | undefined;
  const displayItems = shoppingItems?.slice(0, 3) || [];
  const remainingCount = shoppingItems ? Math.max(0, shoppingItems.length - 3) : 0;

  // Delivery method icon for reminders
  const deliveryMethod = meta?.delivery_method as string | undefined;
  const deliveryIcon = deliveryMethod === 'whatsapp' ? '💬' : deliveryMethod === 'email' ? '📧' : null;

  return (
    <div
      className="flex items-start gap-3 p-3 md:p-4 bg-white rounded-lg border border-gray-200 min-h-[44px]"
      data-testid="activity-item"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <ActivityAvatar actorName={activity.actor_name || 'Kira'} actorId={activity.actor_id} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Main text */}
        <p className="text-sm md:text-base leading-relaxed font-semibold">
          <span className="font-semibold">{activity.actor_name || 'Kira'}</span>
          {' '}
          <span className="text-gray-700 font-normal">{actionMessage}</span>
          {metadataValue && (
            <>
              {' '}
              <span className="font-medium text-gray-900 font-normal">{metadataValue}</span>
            </>
          )}
          {activity.entity_type === 'shopping' && activity.action === 'deleted' && (
            <span className="text-gray-700 font-normal"> z listy zakupów</span>
          )}
        </p>

        {/* Shopping items list */}
        {activity.entity_type === 'shopping' && activity.action === 'created' && displayItems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {displayItems.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {item}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                +{remainingCount} więcej
              </span>
            )}
          </div>
        )}

        {/* Board badge for tasks */}
        {(activity.metadata as Record<string, any>)?.board_name && (
          <div className="mt-1">
            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
              {String((activity.metadata as Record<string, any>).board_name).toUpperCase()}
            </span>
          </div>
        )}

        {/* Delivery icon for reminders */}
        {deliveryIcon && (
          <span className="ml-2" aria-label={`Delivery: ${deliveryMethod}`}>
            {deliveryIcon}
          </span>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <span>{entityIcon}</span>
          <span>{timeAgo}</span>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityItemSkeleton
// ═══════════════════════════════════════════════════════════

export function ActivityItemSkeleton() {
  return (
    <div data-testid="activity-skeleton" className="flex items-start gap-3 p-3 md:p-4 bg-white rounded-lg border border-gray-200 min-h-[44px] animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 bg-accent" />

      {/* Content skeleton — 2 text lines + timestamp */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-3/4 bg-accent rounded-md" />
        <div className="h-4 w-1/2 bg-accent rounded-md" />
        <div className="h-3 w-1/3 bg-accent rounded-md" />
      </div>
    </div>
  );
}
