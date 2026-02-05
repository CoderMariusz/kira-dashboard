'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useHousehold } from '@/lib/hooks/useHousehold';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ActivityFiltersProps {
  householdId: string | undefined;
}

const ENTITY_TYPES = [
  { value: 'all', label: 'Wszystko' },
  { value: 'task', label: 'Zadania' },
  { value: 'shopping', label: 'Zakupy' },
  { value: 'reminder', label: 'Przypomnienia' },
  { value: 'board', label: 'Tablice' },
];

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityAvatarSmall
// ═══════════════════════════════════════════════════════════

interface ActivityAvatarSmallProps {
  actorName: string;
  actorId: string | null;
  size?: 'sm' | 'md';
}

function ActivityAvatarSmall({ actorName, actorId, size = 'sm' }: ActivityAvatarSmallProps) {
  const isKira = !actorId || actorName === 'Kira';
  const sizeClasses = size === 'sm' ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-sm';

  if (isKira) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-purple-100 flex items-center justify-center`}
        aria-label="Kira"
        role="img"
      >
        🤖
      </div>
    );
  }

  const initials = actorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`${sizeClasses} rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium`}
      aria-label={actorName}
      role="img"
    >
      {initials}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityFiltersSkeleton
// ═══════════════════════════════════════════════════════════

function ActivityFiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ActivityFilters
// ═══════════════════════════════════════════════════════════

export function ActivityFilters({ householdId }: ActivityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: household, isLoading } = useHousehold();

  // Get current filter values from URL
  const currentType = searchParams.get('type') || 'all';
  const currentActor = searchParams.get('actor') || 'all';

  // Update URL with new filter
  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      const queryString = params.toString();
      const url = queryString ? `?${queryString}` : '';

      router.push(url, { scroll: false });
    },
    [searchParams, router]
  );

  // Handle type filter change
  const handleTypeChange = (value: string) => {
    updateFilter('type', value === 'all' ? '' : value);
  };

  // Handle actor filter change
  const handleActorChange = (value: string) => {
    updateFilter('actor', value === 'all' ? '' : value);
  };

  // Build actor options from household members + Kira
  const actorOptions = [
    { value: 'all', label: 'Wszyscy', id: null as string | null },
    ...(household?.members?.map((member) => ({
      value: member.id,
      label: member.display_name,
      id: member.id,
    })) || []),
    { value: 'kira', label: 'Kira', id: null as string | null },
  ];

  if (isLoading) {
    return <ActivityFiltersSkeleton />;
  }

  return (
    <div
      className="flex flex-col gap-3 md:flex-row md:gap-3"
      data-testid="activity-filters"
    >
      {/* Entity Type Filter */}
      <Select value={currentType} onValueChange={handleTypeChange}>
        <SelectTrigger
          className="w-full md:w-[180px]"
          aria-label="Typ aktywności"
        >
          <SelectValue placeholder="Wszystko" />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Actor Filter */}
      <Select value={currentActor} onValueChange={handleActorChange}>
        <SelectTrigger
          className="w-full md:w-[200px]"
          aria-label="Autor"
        >
          <SelectValue placeholder="Wszyscy" />
        </SelectTrigger>
        <SelectContent>
          {actorOptions.map((actor) => (
            <SelectItem key={actor.value || 'all'} value={actor.value}>
              <div className="flex items-center gap-2">
                <ActivityAvatarSmall
                  actorName={actor.label}
                  actorId={actor.id}
                  size="sm"
                />
                <span>{actor.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
