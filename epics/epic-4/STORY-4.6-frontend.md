---
story_id: STORY-4.6
title: "Activity Feed — migracja komponentów z archive/ z real-time updates i filtrami"
epic: EPIC-4
module: home
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: /epics/kira-home-dashboard-mockup.html#pane-activity
api_reference: /epics/EPIC-4-home-integration.md
priority: must
estimated_effort: 6h
depends_on: STORY-4.3
blocks: STORY-4.9
tags: [migration, activity-feed, realtime, supabase, avatars, dark-theme, filters, mobile]
---

## 🎯 User Story

**Jako** Angelika (HELPER+) korzystająca z kira-dashboard  
**Chcę** widzieć na żywo strumień aktywności rodziny (kto co zrobił — dodał zakup, ukończył zadanie, zaproszenie do household) z możliwością filtrowania wg typu zdarzenia  
**Żeby** być na bieżąco z tym co się dzieje w domu bez konieczności pytania każdego z osobna

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/home/activity` → plik `src/app/home/activity/page.tsx`
- Komponenty: `src/components/home/activity/` (nowy katalog — migracja z archive/)
- Hook: `useActivity()` z STORY-4.3 (`src/lib/hooks/home/useActivity.ts`) — zawiera Supabase real-time subscription przez kanał `activity_log`
- Supabase client: `src/lib/supabase/client.ts` (nowy projekt — NIE archive/)

### Powiązane pliki
UX Ref: `/epics/kira-home-dashboard-mockup.html` — zakładka `📡 Activity` (pane-activity) i mini-activity w Overview; mobile mockup — filter chips horizontal scroll, feed items z timeline dot  
Źródło migracji: `archive/src/components/activity/` — ActivityFeed.tsx, ActivityItem.tsx, ActivityAvatar.tsx, ActivityFilters.tsx

### Stan systemu przed tą story
- STORY-4.1 (database) ukończona: tabela `activity_log` w Supabase z RLS (pola: id, actor_id, actor_name, entity_type, action, metadata JSONB, created_at, household_id)
- STORY-4.3 (wiring) ukończona: hook `useActivity(filter?)` eksportuje `{ activities, isLoading, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage }`; Supabase real-time subscription na `activity_log` dla bieżącego household; typ `ActivityEvent` w `src/lib/types/home.ts`
- `useHousehold()` dostępny z STORY-4.3 — zwraca `{ household, members }`

---

## ✅ Acceptance Criteria

### AC-1: Strona `/home/activity` renderuje się bez błędów
GIVEN: Użytkownik z rolą HELPER+ jest zalogowany i wchodzi na `/home/activity`  
WHEN: Next.js renderuje `src/app/home/activity/page.tsx`  
THEN: Strona wyświetla nagłówek "📡 Feed aktywności" + pasek filtrów + feed z aktywnościami  
AND: Konsola przeglądarki nie zawiera żadnych `console.error` podczas normalnego renderowania

### AC-2: Stan ładowania — skeleton
GIVEN: `useActivity()` jest w stanie `isLoading: true`  
WHEN: Komponent `ActivityFeed` montuje się  
THEN: Wyświetla się 5 kart-szkieletów `ActivityItemSkeleton`: każdy zawiera okrąg awatara `w-[32px] h-[32px] rounded-full bg-[#2a2540] animate-pulse` + 3 prostokąty-linie `bg-[#2a2540] rounded-[4px] animate-pulse` (szerokości: 75%, 50%, 33%)

### AC-3: Feed wyświetla ostatnie 20 aktywności w porządku chronologicznym (newest first)
GIVEN: `useActivity()` zwraca tablicę `activities: ActivityEvent[]` (posortowaną malejąco po `created_at`)  
WHEN: Dane załadują się  
THEN: Komponenty `ActivityItem` renderują się w kolejności newest first — najnowsza aktywność na górze  
AND: Widoczne jest co najwyżej 20 zdarzeń (pierwsze załadowanie)  
AND: Na dole listy widoczny jest przycisk "Załaduj więcej" jeśli `hasNextPage: true`

### AC-4: Format tekstu zdarzenia — "{Imię} {akcja} '{item}' — {relative_time}"
GIVEN: Zdarzenie `{ actor_name: "Angelika", entity_type: "shopping", action: "created", metadata: { item: "Mleko" }, created_at: "2026-02-19T14:22:00Z" }`  
WHEN: Renderuje się `ActivityItem`  
THEN: Tekst główny wyświetla: **"Angelika"** (bold, kolor `#c4b5fd`) + " dodała 'Mleko' do listy zakupów"  
AND: Pod tekstem: czas względny "10 min temu" (kolor `#4b4569`, font-size 10px)  
AND: Badge: "🛒 zakupy" z tłem `#1a3a1a` i kolorem `#4ade80`

Mapowanie akcji na tekst polski (pełna lista):
```
entity_type: "shopping", action: "created"    → "{aktor} dodała/dodał '{item}' do listy zakupów"
entity_type: "shopping", action: "completed"  → "{aktor} kupił/a '{item}'"
entity_type: "shopping", action: "deleted"    → "{aktor} usunął/ęła '{item}' z listy zakupów"
entity_type: "task",     action: "created"    → "{aktor} dodał/a zadanie '{item}'"
entity_type: "task",     action: "updated"    → "{aktor} zaktualizował/a zadanie '{item}'"
entity_type: "task",     action: "completed"  → "{aktor} ukończył/a zadanie '{item}' ✅"
entity_type: "task",     action: "moved"      → "{aktor} przeniósł/a '{item}' do {metadata.column_name}"
entity_type: "task",     action: "deleted"    → "{aktor} usunął/ęła zadanie '{item}'"
entity_type: "household",action: "member_joined" → "{aktor} dołączył/a do household"
entity_type: "household",action: "member_invited"→ "{aktor} zaprosił/a {metadata.invitee_name}"
```

### AC-5: Czas względny — poprawna polska odmiana
GIVEN: Zdarzenie z `created_at` różnych timestampów  
WHEN: `ActivityItem` renderuje czas  
THEN:
- < 1 minuta: "przed chwilą"
- 1–59 min: "N min temu" (N = liczba minut)
- 1–23 godz: "N godz. temu" (np. "2 godz. temu")
- Wczoraj (24–48h): "Wczoraj o HH:MM"
- ≥ 2 dni: format "DD.MM.YYYY" (np. "17.02.2026")

### AC-6: ActivityAvatar — inicjały w kolorowym kółku
GIVEN: Zdarzenie z `actor_id: "user-uuid-abc"`, `actor_name: "Angelika"`  
WHEN: Renderuje się `ActivityAvatar`  
THEN: Wyświetlany jest okrąg `w-[32px] h-[32px] border-radius: 50%` z inicjałami "A" (pierwsze litery imienia i nazwiska)  
AND: Kolor tła jest deterministyczny per `actor_id` (jeden z 5 gradientów — patrz stały zestaw niżej)  
AND: Tekst inicjałów: `color: #fff; font-size: 12px; font-weight: 700`

Deterministyczny kolor:
```tsx
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#ec4899,#f97316)', // różowy-pomarańczowy
  'linear-gradient(135deg,#3b82f6,#06b6d4)', // niebieski-cyan
  'linear-gradient(135deg,#a78bfa,#60a5fa)', // fioletowy-niebieski
  'linear-gradient(135deg,#34d399,#06b6d4)', // zielony-cyan
  'linear-gradient(135deg,#f59e0b,#ef4444)', // żółty-czerwony
];
function getAvatarGradient(actorId: string): string {
  const hash = actorId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
```

AND: Dla `actor_id === null` lub `actor_name === "Kira"`: wyświetlane jest emoji 🤖 na tle `background: #e9d5ff`

### AC-7: ActivityFilters — filter chips horizontal scroll
GIVEN: Użytkownik widzi stronę `/home/activity`  
WHEN: Strona załaduje się  
THEN: Pasek filtrów renderuje 4 chipy: "Wszystkie" | "Zakupy" | "Zadania" | "Household"  
AND: Chipy są w poziomym scroll container: `display: flex; gap: 7px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar: none`  
AND: Każdy chip ma `min-height: 32px; padding: 6px 14px; border-radius: 20px; white-space: nowrap`  
AND: Aktywny chip: `background: #2d1b4a; border: 1px solid #7c3aed; color: #c4b5fd; font-weight: 600`  
AND: Nieaktywny chip: `background: #2a2540; border: 1px solid #3b3d7a; color: #6b7280`  
AND: Domyślnie aktywny: "Wszystkie"

### AC-8: Filtrowanie — zmiana filtru przeładowuje feed
GIVEN: Użytkownik klika chip "Zakupy"  
WHEN: `onFilterChange('shopping')` jest wywołane  
THEN: `useActivity({ entity_type: 'shopping' })` refetchuje dane LUB lokalnie filtruje przez `entity_type === 'shopping'`  
AND: W feedzie widoczne są tylko zdarzenia z `entity_type === "shopping"` (badge "🛒 zakupy")  
AND: Chip "Zakupy" jest aktywny, pozostałe nieaktywne  
AND: Gdy użytkownik klika "Zadania": tylko `entity_type === "task"` — badge "✅ zadanie"  
AND: Gdy użytkownik klika "Household": tylko `entity_type === "household"` — badge "👥 household" (tło `#3a2a00`, kolor `#fbbf24`)

### AC-9: Real-time update — nowe zdarzenie pojawia się bez odświeżania
GIVEN: Użytkownik ma otwartą stronę `/home/activity`  
WHEN: Mariusz w innej sesji dodaje "Kurczak" do listy zakupów (API wywołuje `INSERT INTO activity_log ...`)  
THEN: Nowe zdarzenie pojawia się automatycznie na górze listy w przeciągu ≤ 2 sekund (latency Supabase realtime)  
AND: Nie jest wymagane odświeżenie strony ani ręczne kliknięcie  
AND: Nowe zdarzenie ma poprawny tekst: "Mariusz dodał 'Kurczak' do listy zakupów" + timestamp "przed chwilą"

### AC-10: Empty state — brak aktywności
GIVEN: `useActivity()` zwraca `activities: []` i `isLoading: false`  
WHEN: Komponent `ActivityFeed` renderuje się  
THEN: Wyświetla się EmptyState z:
- Ikoną 📡 (font-size: 48px, text-center)
- Tytułem: "Brak aktywności" (text-[#e6edf3], font-bold, 16px)
- Opisem: "Zacznij zarządzać domem!" (text-[#6b7280], 12px)

### AC-11: "Załaduj więcej" — infinite scroll (load more button)
GIVEN: `hasNextPage: true` po załadowaniu pierwszych 20 zdarzeń  
WHEN: Użytkownik klika "Załaduj więcej"  
THEN: Wywołuje się `fetchNextPage()` z hooka  
AND: Podczas ładowania: przycisk pokazuje spinner `animate-spin` + tekst "Ładowanie..."  
AND: Po załadowaniu: kolejne zdarzenia doklejają się do dołu listy  
AND: Gdy `hasNextPage: false`: przycisk "Załaduj więcej" znika

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home/activity`  
Komponent strony: `src/app/home/activity/page.tsx`  
Katalog komponentów: `src/components/home/activity/`

### Krok po kroku — co stworzyć

**Krok 1: Utwórz katalog i przenieś pliki z archive/**
```bash
mkdir -p src/components/home/activity
# Migruj:
# archive/src/components/activity/ActivityFeed.tsx    → src/components/home/activity/ActivityFeed.tsx
# archive/src/components/activity/ActivityItem.tsx    → src/components/home/activity/ActivityItem.tsx
# archive/src/components/activity/ActivityAvatar.tsx  → src/components/home/activity/ActivityAvatar.tsx
# archive/src/components/activity/ActivityFilters.tsx → ZASTĄP przez ActivityFilterChips.tsx (patrz niżej)
```

**Krok 2: Zastąp stare importy nowymi**

W każdym pliku:
- `import { useActivity, useActivityRealtime } from '@/lib/hooks/useActivity'` → `import { useActivity } from '@/lib/hooks/home/useActivity'` (realtime jest wbudowany w hook z STORY-4.3)
- `import { useHousehold } from '@/lib/hooks/useHousehold'` → `import { useHousehold } from '@/lib/hooks/home/useHousehold'`
- `import type { ActivityLog } from '@/lib/types/database'` → `import type { ActivityEvent } from '@/lib/types/home'`
- `import { Button } from '@/components/ui/button'` → z nowego projektu
- `import { Skeleton } from '@/components/ui/skeleton'` → z nowego projektu
- `import { Loader2, RefreshCw } from 'lucide-react'` → zachowaj (lucide-react jest w nowym projekcie)

**Krok 3: ActivityFeed.tsx — nowy hook API + dark theme**

```tsx
// src/components/home/activity/ActivityFeed.tsx
'use client';
import { useState } from 'react';
import { useActivity } from '@/lib/hooks/home/useActivity';
import { ActivityItem } from './ActivityItem';
import { Loader2, RefreshCw } from 'lucide-react';

export type ActivityFilter = 'all' | 'shopping' | 'task' | 'household';

interface ActivityFeedProps {
  filter: ActivityFilter;
}

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-[12px]" aria-label="Ładowanie aktywności" data-testid="activity-feed-loading">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-[12px] p-[10px] bg-[#1a1730] border border-[#2a2540] rounded-[10px] animate-pulse">
          <div className="w-[32px] h-[32px] rounded-full bg-[#2a2540] flex-shrink-0" />
          <div className="flex-1 space-y-[8px]">
            <div className="h-[14px] w-3/4 bg-[#2a2540] rounded-[4px]" />
            <div className="h-[12px] w-1/2 bg-[#2a2540] rounded-[4px]" />
            <div className="h-[10px] w-1/3 bg-[#2a2540] rounded-[4px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-[48px]" data-testid="activity-empty-state">
      <div className="text-[48px] mb-[12px]">📡</div>
      <p className="text-[16px] font-bold text-[#e6edf3] mb-[6px]">Brak aktywności</p>
      <p className="text-[12px] text-[#6b7280]">Zacznij zarządzać domem!</p>
    </div>
  );
}

export function ActivityFeed({ filter }: ActivityFeedProps) {
  const {
    activities,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivity(filter === 'all' ? undefined : filter);

  if (isLoading) return <ActivityFeedSkeleton />;

  if (error) {
    return (
      <div className="text-center py-[48px]" data-testid="activity-error-state">
        <p className="text-[#f87171] mb-[12px]">Nie udało się załadować aktywności</p>
        <p className="text-[12px] text-[#6b7280] mb-[16px]">{error.message || 'Sprawdź połączenie i spróbuj ponownie'}</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-[6px] mx-auto px-[16px] py-[8px] bg-[#2a2540] hover:bg-[#3b3d7a] text-[#e6edf3] text-[12px] rounded-[8px] transition-colors"
          aria-label="Spróbuj ponownie"
        >
          <RefreshCw className="w-[14px] h-[14px]" />
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (!activities || activities.length === 0) return <EmptyState />;

  return (
    <div className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-[16px]" data-testid="activity-feed">
      <div className="flex flex-col">
        {activities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isLast={index === activities.length - 1}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="text-center pt-[14px] border-t border-[#2a2540] mt-[4px]">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-[6px] mx-auto px-[20px] py-[8px] bg-[#2a2540] hover:bg-[#3b3d7a] disabled:opacity-50 text-[#e6edf3] text-[12px] rounded-[8px] transition-colors"
            aria-label="Załaduj więcej aktywności"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-[14px] h-[14px] animate-spin" role="status" aria-label="Ładowanie" />
                Ładowanie...
              </>
            ) : (
              'Załaduj więcej'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Krok 4: ActivityItem.tsx — nowa logika tekstów + dark theme**

Pełna implementacja `getActionText(activity: ActivityEvent): string`:
```tsx
function getActionText(activity: ActivityEvent): string {
  const { entity_type, action } = activity;
  const meta = activity.metadata as Record<string, unknown> | null;
  const itemName = (meta?.item as string) || (meta?.title as string) || '';
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
```

Badge per entity_type:
```tsx
const BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  shopping:  { bg: '#1a3a1a', color: '#4ade80',  label: '🛒 zakupy' },
  task:      { bg: '#1a2744', color: '#60a5fa',  label: '✅ zadanie' },
  household: { bg: '#3a2a00', color: '#fbbf24',  label: '👥 household' },
};
```

Pełna struktura ActivityItem (dark theme):
```tsx
export function ActivityItem({ activity, isLast }: { activity: ActivityEvent; isLast: boolean }) {
  const actionText = getActionText(activity);
  const timeAgo = formatRelativeTime(activity.created_at); // funkcja z kropu 5
  const badge = BADGE_STYLES[activity.entity_type] ?? BADGE_STYLES.task;

  return (
    <div className="flex gap-[12px] py-[10px] border-b border-[#1f1c2e] last:border-b-0" data-testid="activity-item">
      {/* Timeline */}
      <div className="flex flex-col items-center flex-shrink-0">
        <ActivityAvatar actorName={activity.actor_name || 'Kira'} actorId={activity.actor_id} size="md" />
        {!isLast && <div className="w-[1px] bg-[#2a2540] flex-1 mt-[5px] min-h-[16px]" />}
      </div>

      {/* Body */}
      <div className="flex-1 pt-[4px] pb-[4px]">
        <p className="text-[12px] text-[#c9d1d9] leading-[1.5]">
          <strong className="text-[#c4b5fd] font-semibold">{activity.actor_name || 'Kira'}</strong>
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
```

**Krok 5: formatRelativeTime() — polska odmiana**

```tsx
// Wewnątrz ActivityItem.tsx lub osobny util: src/lib/utils/relative-time.ts
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
```

**Krok 6: ActivityAvatar.tsx — deterministyczny kolor + inicjały**

```tsx
// src/components/home/activity/ActivityAvatar.tsx
'use client';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#ec4899,#f97316)',
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#a78bfa,#60a5fa)',
  'linear-gradient(135deg,#34d399,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];

function getAvatarGradient(actorId: string | null): string {
  if (!actorId) return 'background: #e9d5ff'; // Kira
  const hash = actorId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface ActivityAvatarProps {
  actorName: string;
  actorId: string | null;
  size?: 'sm' | 'md';
}

const SIZE_MAP = {
  sm: 'w-[22px] h-[22px] text-[9px]',
  md: 'w-[32px] h-[32px] text-[12px]',
};

export function ActivityAvatar({ actorName, actorId, size = 'md' }: ActivityAvatarProps) {
  const isKira = !actorId || actorName === 'Kira';
  const sizeClass = SIZE_MAP[size];

  if (isKira) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{ background: '#e9d5ff' }}
        role="img"
        aria-label="Kira"
      >
        🤖
      </div>
    );
  }

  const initials = getInitials(actorName);
  const gradient = getAvatarGradient(actorId);

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white`}
      style={{ background: gradient }}
      role="img"
      aria-label={actorName}
    >
      {initials}
    </div>
  );
}
```

**Krok 7: ActivityFilterChips.tsx — NOWY komponent zamiast ActivityFilters z archive/**

ActivityFilters z archive/ używał URL params i Select dropdownów — zastąp filter chips (zgodnie z mockupem desktop+mobile):

```tsx
// src/components/home/activity/ActivityFilterChips.tsx
'use client';

export type ActivityFilter = 'all' | 'shopping' | 'task' | 'household';

interface ActivityFilterChipsProps {
  activeFilter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
}

const FILTER_OPTIONS: { key: ActivityFilter; label: string }[] = [
  { key: 'all',       label: 'Wszystkie' },
  { key: 'shopping',  label: 'Zakupy' },
  { key: 'task',      label: 'Zadania' },
  { key: 'household', label: 'Household' },
];

export function ActivityFilterChips({ activeFilter, onFilterChange }: ActivityFilterChipsProps) {
  return (
    <div
      className="flex gap-[7px] overflow-x-auto pb-[2px] mb-[16px]"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      role="group"
      aria-label="Filtry aktywności"
    >
      {FILTER_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onFilterChange(opt.key)}
          aria-pressed={activeFilter === opt.key}
          className={`
            flex items-center px-[14px] py-[6px] text-[11px] rounded-[20px] border
            whitespace-nowrap transition-colors cursor-pointer flex-shrink-0
            min-h-[32px]
            ${activeFilter === opt.key
              ? 'bg-[#2d1b4a] border-[#7c3aed] text-[#c4b5fd] font-semibold'
              : 'bg-[#2a2540] border-[#3b3d7a] text-[#6b7280] hover:text-[#e6edf3]'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

**Krok 8: Strona `/home/activity/page.tsx`**

```tsx
// src/app/home/activity/page.tsx
'use client';
import { useState } from 'react';
import { ActivityFeed, type ActivityFilter } from '@/components/home/activity/ActivityFeed';
import { ActivityFilterChips } from '@/components/home/activity/ActivityFilterChips';

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');

  return (
    <div className="p-[18px]">
      <div className="flex items-center gap-[10px] mb-[16px]">
        <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">📡 Feed aktywności</h2>
      </div>
      <ActivityFilterChips
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <ActivityFeed filter={activeFilter} />
    </div>
  );
}
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `ActivityFeed` | Container | `filter: ActivityFilter` + `useActivity()` | loading (skeleton), empty, error, filled |
| `ActivityItem` | Presentation | `activity: ActivityEvent`, `isLast: boolean` | default (z timeline dot+line) |
| `ActivityAvatar` | Avatar | `actorName, actorId, size` | Kira (🤖), user (inicjały+gradient) |
| `ActivityFilterChips` | Filter bar | `activeFilter, onFilterChange` | per chip: active/inactive |

### Stany widoku

**Loading:**  
5 kart-szkieletów `ActivityItemSkeleton`: okrąg awatara `w-[32px] h-[32px] bg-[#2a2540] animate-pulse` + 3 linie animate-pulse (szerokości 75%, 50%, 33%). Każdy w prostokącie `bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-[10px]`.

**Empty (brak aktywności):**  
Ikona 📡 (font-size: 48px), tytuł "Brak aktywności" (`text-[#e6edf3] font-bold text-[16px]`), opis "Zacznij zarządzać domem!" (`text-[#6b7280] text-[12px]`), `text-center py-[48px]`.

**Error (błąd serwera/sieci):**  
"Nie udało się załadować aktywności" (`text-[#f87171]`), opis błędu z `error.message`, przycisk "Spróbuj ponownie" z ikoną RefreshCw, `bg-[#2a2540]`.

**Filled (normalny stan):**  
`ActivityFilterChips` → kontener `bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-[16px]` z listą `ActivityItem` (timeline linia między nimi, ostatni bez linii) → przycisk "Załaduj więcej" (jeśli hasNextPage).

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na /home/activity → page.tsx renderuje ActivityFilterChips + ActivityFeed(filter='all')
2. ActivityFeed mountuje się → useActivity() triggeruje fetch + aktywuje Supabase realtime subscription
3. isLoading: true → 5 ActivityItemSkeleton widoczne
4. Dane załadowane → lista ActivityItem (max 20), przycisk "Załaduj więcej" jeśli hasNextPage
5. Użytkownik klika chip "Zakupy" → setActiveFilter('shopping') → ActivityFeed re-mountuje z filter='shopping' → refetch z {entity_type: 'shopping'}
6. Mariusz w innej sesji dodaje produkt → Supabase realtime INSERT → useActivity() push nowy element na górę listy
7. Użytkownik klika "Załaduj więcej" → fetchNextPage() → isFetchingNextPage: true → spinner → kolejne zdarzenia doklejone na dół
8. hasNextPage: false → przycisk "Załaduj więcej" znika
```

### Responsive / Dostępność

- Mobile (375px+): ActivityFilterChips — `overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch`; każdy chip `min-height: 32px; white-space: nowrap`; ActivityItem — avatar 28px (size="sm"), tekst 12px; "Załaduj więcej" — `width: 100%` na mobile
- Desktop (1280px+): feed zajmuje pełną szerokość content area w max-width kontenerze (~800px), avatar 32px (size="md")
- Keyboard: Tab przez filtry i przycisk "Załaduj więcej"; Enter/Space aktywuje chip filtru
- ARIA: `ActivityFilterChips` — `role="group" aria-label="Filtry aktywności"`; każdy chip — `aria-pressed={isActive}`; loading skeleton — `aria-label="Ładowanie aktywności"`; error button — `aria-label="Spróbuj ponownie"`; "Załaduj więcej" — `aria-label="Załaduj więcej aktywności"`; spinner — `role="status" aria-label="Ładowanie"`

---

## ⚠️ Edge Cases

### EC-1: Real-time — duplikacja zdarzeń
Scenariusz: Supabase realtime może wysłać to samo zdarzenie dwa razy (np. reconnect po utracie połączenia)  
Oczekiwane zachowanie: `useActivity()` z STORY-4.3 deduplikuje events po `id`; ActivityFeed nie renderuje duplikatów  
Komunikat dla użytkownika: brak (transparentne dla użytkownika)

### EC-2: actor_name = null w bazie
Scenariusz: Zdarzenie w `activity_log` ma `actor_id` ale `actor_name` = null (edge case podczas tworzenia konta)  
Oczekiwane zachowanie: `ActivityItem` wyświetla "Użytkownik" jako fallback zamiast pustego tekstu; `ActivityAvatar` używa "?" jako inicjałów  
Komunikat dla użytkownika: tekst zdarzenia: "Użytkownik dodał/a 'Mleko' do listy zakupów"

### EC-3: Bardzo długi tytuł zadania/produktu w metadanych
Scenariusz: `metadata.item = "Ekologiczny chleb żytni na zakwasie z pestkami dyni i słonecznika 750g"` (80+ znaków)  
Oczekiwane zachowanie: Tekst zdarzenia przełamuje się naturalnie (`line-height: 1.5`); nie ma overflow poza kontener; bez truncation — pełny tekst widoczny  
Komunikat dla użytkownika: brak

### EC-4: Filtr aktywny ale brak danych dla tego filtru
Scenariusz: Użytkownik klika "Household" ale brak zdarzeń `entity_type === "household"` w bazie  
Oczekiwane zachowanie: `useActivity({ entity_type: 'household' })` zwraca `activities: []` → `EmptyState` renderuje się: "Brak aktywności — Zacznij zarządzać domem!"  
Komunikat dla użytkownika: "Brak aktywności" + "Zacznij zarządzać domem!"

---

## 🚫 Out of Scope tej Story
- Filtrowanie po osobie (actor_id) — PersonFilter w ActivityFilters z archive/ pomijamy; dodać w przyszłości
- Oznaczanie aktywności jako "przeczytana" (read/unread state) — osobna story
- Usuwanie zdarzeń z activity_log przez użytkownika — tylko ADMIN może i to osobna story  
- Wysyłanie notyfikacji push o nowych zdarzeniach (EPIC-2)
- Eksport historii aktywności (CSV/PDF) — poza zakresem v1
- Paginacja przez URL params (SEO) — lista jest client-side only

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter (`next lint`) bez błędów
- [ ] Katalog `src/components/home/activity/` istnieje z 4 plikami: ActivityFeed.tsx, ActivityItem.tsx, ActivityAvatar.tsx, ActivityFilterChips.tsx
- [ ] Strona `/home/activity` renderuje się bez `console.error`
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading skeleton ×5, empty EmptyState, error ErrorState, filled feed)
- [ ] `getActionText()` pokrywa wszystkie kombinacje entity_type × action (co najmniej 10 przypadków)
- [ ] `formatRelativeTime()` zwraca poprawną polską formę dla: < 1 min, minuty, godziny, wczoraj, > 2 dni
- [ ] ActivityAvatar: deterministyczny gradient per actorId; fallback 🤖 dla Kira (actorId: null)
- [ ] ActivityFilterChips: 4 chipy (Wszystkie/Zakupy/Zadania/Household); active/inactive style; horizontal scroll bez scrollbara
- [ ] Filtrowanie działa — zmiana filtru zmienia wyświetlane zdarzenia
- [ ] Real-time: nowe zdarzenia pojawiają się bez odświeżania strony (Supabase subscription)
- [ ] "Załaduj więcej" — loading spinner, doklejanie, znika gdy hasNextPage: false
- [ ] Dark theme: bg #1a1730 (feed container), #13111c (body), border #2a2540, text primary #e6edf3, accent #c4b5fd
- [ ] Mobile 375px: filter chips horizontal scroll, min-height 32px na chipy, brak horizontal scroll na stronie
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe
- [ ] Story review przez PO
