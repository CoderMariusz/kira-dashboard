'use client';

import type { ActivityEvent } from '@/types/home';
import { ActivityAvatar } from './ActivityAvatar';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface ActivityItemProps {
  activity: ActivityEvent;
  isLast: boolean;
}

// ══════════════════════════════════════════════════════════
// CONSTANTS — badge styles per entity_type (AC-4)
// ══════════════════════════════════════════════════════════

const BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  shopping:  { bg: '#1a3a1a', color: '#4ade80',  label: '🛒 zakupy' },
  task:      { bg: '#1a2744', color: '#60a5fa',  label: '✅ zadanie' },
  household: { bg: '#3a2a00', color: '#fbbf24',  label: '👥 household' },
};

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

/**
 * AC-5: Czas względny — poprawna polska odmiana
 */
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffDays = diffMs / 86_400_000;

  if (diffMin < 1)  return 'przed chwilą';
  if (diffMin < 60) return `${diffMin} min temu`;
  if (diffH < 24)   return `${diffH} godz. temu`;
  if (diffDays >= 1 && diffDays < 2) {
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `Wczoraj o ${hh}:${mm}`;
  }
  return date.toLocaleDateString('pl-PL'); // "17.02.2026"
}

/**
 * AC-4: Format tekstu zdarzenia — "{Imię} {akcja} '{item}' — {relative_time}"
 * Mapowanie akcji na tekst polski
 */
function getActionText(activity: ActivityEvent): string {
  const { entity_type, action, entity_name, details } = activity;
  const meta = details as Record<string, unknown> | null;
  
  // Nazwa elementu - z entity_name lub details.item lub details.title
  const itemName = entity_name || 
    (meta?.item as string) || 
    (meta?.title as string) || '';
  const columnName = (meta?.column_name as string) || '';
  const inviteeName = (meta?.invitee_name as string) || '';

  switch (`${entity_type}:${action}`) {
    case 'shopping:created':   return `dodała/dodał '${itemName}' do listy zakupów`;
    case 'shopping:completed': return `kupił/a '${itemName}'`;
    case 'shopping:deleted':   return `usunął/ęła '${itemName}' z listy zakupów`;
    case 'task:created':       return `dodał/a zadanie '${itemName}'`;
    case 'task:updated':       return `zaktualizował/a zadanie '${itemName}'`;
    case 'task:completed':     return `ukończył/a zadanie '${itemName}' ✅`;
    case 'task:moved':         return `przeniósł/a '${itemName}' do ${columnName}`;
    case 'task:deleted':       return `usunął/ęła zadanie '${itemName}'`;
    case 'household:member_joined':  return `dołączył/a do household`;
    case 'household:member_invited': return `zaprosił/a ${inviteeName}`;
    default: return `${action} ${entity_type}`;
  }
}

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityItem
// ══════════════════════════════════════════════════════════

/**
 * AC-3: Feed wyświetla ostatnie aktywności w porządku chronologicznym (newest first)
 * AC-4: Format tekstu zdarzenia
 */
export function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const actionText = getActionText(activity);
  const timeAgo = formatRelativeTime(activity.created_at);
  const badge = BADGE_STYLES[activity.entity_type] ?? BADGE_STYLES.task ?? { bg: '#2a2540', color: '#6b7280', label: '📋 inny' };
  
  // EC-2: actor_name = null fallback
  const actorName = activity.actor_name || 'Użytkownik';

  return (
    <div 
      className="flex gap-[12px] py-[10px] border-b border-[#1f1c2e] last:border-b-0" 
      data-testid="activity-item"
    >
      {/* Timeline — avatar + connecting line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <ActivityAvatar 
          actorName={actorName} 
          actorId={activity.actor_id} 
          size="md" 
        />
        {!isLast && (
          <div className="w-[1px] bg-[#2a2540] flex-1 mt-[5px] min-h-[16px]" />
        )}
      </div>

      {/* Body — text + metadata */}
      <div className="flex-1 pt-[4px] pb-[4px]">
        <p className="text-[12px] text-[#c9d1d9] leading-[1.5]">
          <strong className="text-[#c4b5fd] font-semibold">{actorName}</strong>
          {' '}{actionText}
        </p>
        <div className="flex items-center gap-[6px] mt-[4px] flex-wrap">
          <span className="text-[10px] text-[#4b4569]">{timeAgo}</span>
          <span
            className="text-[9px] font-semibold px-[7px] py-[2px] rounded-[5px]"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityItemSkeleton
// ══════════════════════════════════════════════════════════

/**
 * AC-2: Stan ładowania — skeleton
 */
export function ActivityItemSkeleton() {
  return (
    <div 
      className="flex items-start gap-[12px] p-[10px] bg-[#1a1730] border border-[#2a2540] rounded-[10px] animate-pulse"
      data-testid="activity-item-skeleton"
    >
      {/* Avatar skeleton */}
      <div className="w-[32px] h-[32px] rounded-full bg-[#2a2540] flex-shrink-0" />
      
      {/* Content skeleton — 3 lines */}
      <div className="flex-1 space-y-[8px]">
        <div className="h-[14px] w-3/4 bg-[#2a2540] rounded-[4px]" />
        <div className="h-[12px] w-1/2 bg-[#2a2540] rounded-[4px]" />
        <div className="h-[10px] w-1/3 bg-[#2a2540] rounded-[4px]" />
      </div>
    </div>
  );
}
