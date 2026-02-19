---
story_id: STORY-4.5
title: "Kanban Tasks Board — migracja z archive/ z drag & drop i filtrowaniem per użytkownik"
epic: EPIC-4
module: home
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: /epics/kira-home-dashboard-mockup.html#pane-tasks
api_reference: /epics/EPIC-4-home-integration.md
priority: must
estimated_effort: 10h
depends_on: STORY-4.3
blocks: STORY-4.9
tags: [migration, kanban, dnd-kit, drag-drop, optimistic, dark-theme, filter, household]
---

## 🎯 User Story

**Jako** Angelika (HELPER+) korzystająca z kira-dashboard  
**Chcę** widzieć tablicę kanban z zadaniami domowymi podzielonymi na kolumny (Do zrobienia / W trakcie / Gotowe), móc je przeciągać między kolumnami i filtrować według osoby  
**Żeby** sprawnie zarządzać obowiązkami rodziny i widzieć kto co robi

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/home/tasks` → plik `src/app/home/tasks/page.tsx`
- Komponenty: `src/components/home/kanban/` (nowy katalog — migracja z archive/)
- Hook: `useTasks()` i `moveTask()` z STORY-4.3 (`src/lib/hooks/home/useTasks.ts`)
- Supabase client: `src/lib/supabase/client.ts` (nowy projekt — NIE archive/)
- Pakiety: `@dnd-kit/core`, `@dnd-kit/sortable` — muszą być zainstalowane

### Powiązane pliki
UX Ref: `/epics/kira-home-dashboard-mockup.html` — zakładka `✅ Tasks` (pane-tasks); mobile mockup — kanban z horizontal scroll `.kanban-scroll`  
Źródło migracji: `archive/src/components/kanban/` — Board.tsx, Column.tsx, TaskCard.tsx, TaskModal.tsx, TaskForm.tsx, QuickAddTask.tsx, FilterSidebar.tsx, DragOverlay.tsx, SortableTaskCard.tsx, BoardSkeleton.tsx, EmptyColumn.tsx

### Stan systemu przed tą story
- STORY-4.1 (database) ukończona: tabele `tasks`, `task_columns` w Supabase z RLS
- STORY-4.3 (wiring) ukończona: hook `useTasks()` eksportuje `{ tasks, columns, isLoading, error, moveTask, createTask, updateTask, deleteTask }`; typy `Task`, `TaskColumn`, `HouseholdMember` w `src/lib/types/home.ts`; `useHousehold()` zwraca `{ household, members }`
- Projekt Next.js z `src/app/home/layout.tsx`
- Obecny zalogowany użytkownik dostępny przez `useUser()` z Supabase auth lub przez session context

---

## ✅ Acceptance Criteria

### AC-1: Strona `/home/tasks` renderuje się z 3 kolumnami kanban
GIVEN: Użytkownik z rolą HELPER+ jest zalogowany i wchodzi na `/home/tasks`  
WHEN: Next.js renderuje `src/app/home/tasks/page.tsx`  
THEN: Strona wyświetla nagłówek "✅ Tablica zadań" + toolbar z przyciskiem "➕ Nowe zadanie" + pasek filtrów  
AND: Poniżej renderuje się tablica kanban z 3 kolumnami w układzie grid (desktop: `grid-template-columns: repeat(3, 1fr)`, gap 14px): "Do zrobienia" (dot: #6b7280), "W trakcie" (dot: #f97316), "Gotowe" (dot: #4ade80)  
AND: Każda kolumna ma nagłówek z nazwą, badge z liczbą zadań i pole QuickAddTask

### AC-2: Stan ładowania — BoardSkeleton
GIVEN: `useTasks()` jest w stanie `isLoading: true`  
WHEN: Komponent `Board` montuje się  
THEN: Renderuje się `BoardSkeleton` — 3 prostokąty `bg-[#1a1730] border border-[#2a2540] rounded-[10px] h-[400px] animate-pulse` w układzie grid obok siebie  
AND: Każdy prostokąt zawiera belkę nagłówkową (h-8 bg-[#2a2540] mb-3 rounded) i 3 karty-szkielety (h-[80px] bg-[#13111c] rounded-[8px] mb-2 animate-pulse)

### AC-3: Zadania renderują się w odpowiednich kolumnach
GIVEN: `useTasks()` zwraca tablicę `tasks` z polem `column_id` i `columns` definiujące mapowanie  
WHEN: Dane załadują się  
THEN: Każde zadanie pojawia się w kolumnie odpowiadającej jego `column_id` (np. `todo`, `in_progress`, `done`)  
AND: `TaskCard` wyświetla: tytuł zadania, badge priorytetu (🔴 Pilne / 🟡 Normalne / 🟢 Niski), tag etykiety (jeśli istnieje), avatar przypisanej osoby (inicjały w kolorowym kółku, 20px×20px)  
AND: Zadania w kolumnie "Gotowe" mają `opacity: 0.7` i tytuł ze stylem `text-decoration: line-through; color: #4b4569`

### AC-4: Drag & drop — przeciąganie zadania między kolumnami
GIVEN: Użytkownik widzi tablicę kanban z zadaniami w kolumnach  
WHEN: Użytkownik chwyta zadanie (kliknięcie + przytrzymanie ≥ 8px przesunięcia na desktopie LUB dotknięcie + trzymanie 250ms na mobile) i przeciąga na inną kolumnę  
THEN: Podczas przeciągania: oryginalna karta staje się "ghost" (`opacity: 0.3`), pod kursorem/palcem widoczna jest karta `TaskDragOverlay` — rotacja `rotate(2deg) opacity(0.9)` z cieniem `box-shadow: 0 3px 12px rgba(0,0,0,.5)`  
AND: Kolumna, nad którą kursor się unosi, wyświetla highlight: `background: rgba(124, 58, 237, 0.1); border: 1px solid #4b3d7a` (ring z fioletowym)  
AND: Po puszczeniu karty: `onDragEnd` wywołuje `moveTask(taskId, newColumnId)` — najpierw optimistic update, potem API call

### AC-5: Optimistic update z rollback
GIVEN: Użytkownik przeciągnął kartę "Zapłać rachunki" z "Do zrobienia" do "W trakcie"  
WHEN: `onDragEnd` jest wywołane  
THEN: Natychmiast (bez czekania na API) karta pojawia się w kolumnie "W trakcie" (optimistic update przez mutację lokalnego stanu tasks)  
AND: Wywołuje się `moveTask(taskId, 'in_progress')` z hooka STORY-4.3  
AND: Jeśli API zwróci sukces: stan pozostaje bez zmian (update był optymistyczny)  
AND: Jeśli API zwróci błąd (np. 403, 500): karta wraca do kolumny "Do zrobienia" (rollback), toast: "Nie udało się przenieść zadania. Spróbuj ponownie."

### AC-6: QuickAddTask — szybkie dodawanie zadania
GIVEN: Użytkownik widzi pole QuickAddTask na górze każdej kolumny: input placeholder "Szybkie zadanie..." + przycisk "+"  
WHEN: Użytkownik wpisuje tytuł zadania i klika "+" lub naciska Enter  
THEN: Wywołuje się `createTask({ title, column_id })` — zadanie dodawane do bieżącej kolumny  
AND: Podczas zapisywania: przycisk "+" wyświetla loading spinner lub jest disabled  
AND: Po sukcesie: pole input czyści się, nowe zadanie pojawia się na dole kolumny  
AND: Jeśli tytuł jest pusty: Enter i kliknięcie "+" są ignorowane (przycisk disabled gdy input pusty)

### AC-7: FilterBar — filtrowanie według osoby
GIVEN: Użytkownik widzi pasek filtrów pod nagłówkiem: "Wszystkie" | "Moje" | [lista household members]  
WHEN: Użytkownik klika "Moje"  
THEN: Widoczne są tylko zadania z `assignee_id === currentUser.id`; pozostałe karty znikają z kolumn (nie są renderowane)  
AND: Aktywny filtr ma styl: `background: #2d1b4a; border-color: #7c3aed; color: #c4b5fd; font-weight: 600`  
AND: Nieaktywny filtr: `background: #2a2540; border-color: #3b3d7a; color: #6b7280`  
AND: Gdy użytkownik klika "Angelika" (household member): widoczne są tylko zadania `assignee_id === angelika.id`  
AND: Gdy użytkownik klika "Wszystkie": widoczne są wszystkie zadania bez filtru

### AC-8: Kliknięcie na TaskCard — otwiera TaskModal
GIVEN: Użytkownik widzi tablicę z zadaniami  
WHEN: Użytkownik klika na `TaskCard` (NIE na checkbox, NIE na drag handle)  
THEN: Otwiera się `TaskModal` z pełnymi danymi zadania: tytuł, opis, priorytet (select), assignee (select z household members), kolumna (select), data ukończenia, subtasks (lista checklist)  
AND: Modal ma background `#1a1730`, border `1px solid #3b3d7a`, border-radius 14px, max-height 85vh, overflow-y: auto  
AND: Przycisk "Zapisz" w modalu wywołuje `updateTask(id, {...})` — save inline  
AND: Przycisk "Usuń zadanie" wywołuje `deleteTask(id)` po `window.confirm("Usunąć zadanie '{title}'?")`  
AND: Escape lub kliknięcie tła zamykają modal bez zapisywania

### AC-9: Mobile — horizontal scroll kanban
GIVEN: Użytkownik otwiera `/home/tasks` na ekranie 375px szerokości  
WHEN: Strona renderuje się  
THEN: Kolumny kanban nie wchodzą w grid-layout; zamiast tego: `display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch`  
AND: Każda kolumna ma `min-width: 240px; flex-shrink: 0; scroll-snap-align: start`  
AND: Pod tablicą wyświetla się hint "← Przewiń by zobaczyć więcej →" (text-[10px] text-[#4b4569]) widoczny tylko na mobile  
AND: Touch drag działa z `TouchSensor` z parametrami: `delay: 250ms, tolerance: 5px`

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home/tasks`  
Komponent strony: `src/app/home/tasks/page.tsx`  
Katalog komponentów: `src/components/home/kanban/`

### Krok po kroku — co stworzyć

**Krok 1: Sprawdź i zainstaluj dnd-kit**
```bash
cd /Users/mariuszkrawczyk/codermariusz/kira-dashboard
# Sprawdź package.json czy są już @dnd-kit/core i @dnd-kit/sortable
cat package.json | grep dnd-kit
# Jeśli brak — zainstaluj:
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Krok 2: Utwórz katalog i przenieś pliki z archive/**
```bash
mkdir -p src/components/home/kanban
# Migruj następujące pliki:
# archive/src/components/kanban/Board.tsx          → src/components/home/kanban/Board.tsx
# archive/src/components/kanban/Column.tsx         → src/components/home/kanban/Column.tsx
# archive/src/components/kanban/TaskCard.tsx       → src/components/home/kanban/TaskCard.tsx
# archive/src/components/kanban/TaskModal.tsx      → src/components/home/kanban/TaskModal.tsx
# archive/src/components/kanban/TaskForm.tsx       → src/components/home/kanban/TaskForm.tsx
# archive/src/components/kanban/QuickAddTask.tsx   → src/components/home/kanban/QuickAddTask.tsx
# archive/src/components/kanban/FilterSidebar.tsx  → ZASTĄP przez nowy FilterBar (patrz niżej)
# archive/src/components/kanban/DragOverlay.tsx    → src/components/home/kanban/TaskDragOverlay.tsx
# archive/src/components/kanban/SortableTaskCard.tsx → src/components/home/kanban/SortableTaskCard.tsx
# archive/src/components/kanban/BoardSkeleton.tsx  → src/components/home/kanban/BoardSkeleton.tsx
# archive/src/components/kanban/EmptyColumn.tsx    → src/components/home/kanban/EmptyColumn.tsx
```

**Krok 3: Zastąp stare importy nowymi**

W każdym migrowanym pliku:
- `import { useBoard } from '@/lib/hooks/useBoard'` → usuń; board/columns są w `useTasks()`
- `import { useTasks, useMoveTask } from '@/lib/hooks/useTasks'` → `import { useTasks } from '@/lib/hooks/home/useTasks'`
- `import { useTasksRealtime } from '@/lib/hooks/useRealtime'` → realtime jest w `useTasks()` z STORY-4.3
- `import { useUIStore } from '@/lib/store'` → zastąp lokalnym useState dla modal open/close
- `import { useHousehold } from '@/lib/hooks/useHousehold'` → `import { useHousehold } from '@/lib/hooks/home/useHousehold'`
- Typy: `TaskWithAssignee, TaskColumn, ColumnConfig` → `import type { Task, TaskColumn } from '@/lib/types/home'`
- `import { Button } from '@/components/ui/button'` → z nowego projektu (shadcn w nowym projekcie)
- `import { Badge } from '@/components/ui/badge'` → z nowego projektu
- `import { Avatar, AvatarFallback } from '@/components/ui/avatar'` → z nowego projektu
- `import { Input } from '@/components/ui/input'` → z nowego projektu
- `BOARD_COLUMNS`, `BOARD_LAYOUT`, `RESPONSIVE_TEXT` stałe → zdefiniuj lokalnie w pliku lub `src/lib/constants/home-kanban.ts`

**Krok 4: Board.tsx — główna logika DnD z optimistic update**

```tsx
// src/components/home/kanban/Board.tsx
'use client';
import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTasks } from '@/lib/hooks/home/useTasks';
import { useHousehold } from '@/lib/hooks/home/useHousehold';
import { useUser } from '@/lib/hooks/useUser'; // current logged-in user
import { Column } from './Column';
import { TaskDragOverlay } from './TaskDragOverlay';
import { TaskModal } from './TaskModal';
import { BoardSkeleton } from './BoardSkeleton';
import { FilterBar } from './FilterBar';
import type { Task } from '@/lib/types/home';

const HOME_COLUMNS = [
  { key: 'todo',        label: 'Do zrobienia', dot: '#6b7280' },
  { key: 'in_progress', label: 'W trakcie',    dot: '#f97316' },
  { key: 'done',        label: 'Gotowe',        dot: '#4ade80' },
] as const;

type ColumnKey = typeof HOME_COLUMNS[number]['key'];

export function Board() {
  const { tasks, isLoading, error, moveTask, createTask, updateTask, deleteTask } = useTasks();
  const { members } = useHousehold();
  const { user } = useUser();

  // LOCAL optimistic state — nadpisuje tasks z hooka podczas drag
  const [optimisticTasks, setOptimisticTasks] = useState<Task[] | null>(null);
  const displayTasks = optimisticTasks ?? tasks ?? [];

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Filtrowane zadania wg activeFilter
  const filteredTasks = useMemo(() => {
    if (selectedFilter === 'all') return displayTasks;
    if (selectedFilter === 'mine' && user) return displayTasks.filter(t => t.assignee_id === user.id);
    return displayTasks.filter(t => t.assignee_id === selectedFilter);
  }, [displayTasks, selectedFilter, user]);

  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnKey, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of filteredTasks) {
      const col = task.column_id as ColumnKey;
      if (map[col]) map[col].push(task);
    }
    return map;
  }, [filteredTasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const draggedTask = active.data.current?.task as Task | undefined;
    if (!draggedTask) return;

    // Ustal docelową kolumnę
    let targetColumnId: ColumnKey;
    if (over.data.current?.type === 'column') {
      targetColumnId = over.data.current.columnKey as ColumnKey;
    } else if (over.data.current?.type === 'task') {
      targetColumnId = (over.data.current.task as Task).column_id as ColumnKey;
    } else {
      return;
    }

    if (draggedTask.column_id === targetColumnId) return; // brak zmiany

    // 1. OPTIMISTIC UPDATE — przesuwamy lokalnie natychmiast
    const prevTasks = tasks ?? [];
    setOptimisticTasks(
      prevTasks.map(t => t.id === draggedTask.id ? { ...t, column_id: targetColumnId } : t)
    );

    // 2. API CALL
    moveTask(draggedTask.id, targetColumnId)
      .then(() => {
        setOptimisticTasks(null); // sukces — hook tasks jest już zaktualizowany
      })
      .catch(() => {
        // ROLLBACK
        setOptimisticTasks(null); // przywróć dane z hooka (które nie zostały zmienione)
        // Toast: "Nie udało się przenieść zadania. Spróbuj ponownie."
      });
  }, [tasks, moveTask]);

  if (isLoading) return <BoardSkeleton columns={HOME_COLUMNS.length} />;
  if (error) return <BoardErrorState error={error} />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <FilterBar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        members={members ?? []}
      />

      {/* Desktop: grid; Mobile: flex scroll */}
      <div className="
        grid grid-cols-3 gap-[14px]
        md:grid md:grid-cols-3
        max-md:grid-cols-none max-md:flex max-md:overflow-x-auto max-md:scroll-snap-type-x max-md:gap-[10px] max-md:pb-[10px]
      ">
        {HOME_COLUMNS.map(col => (
          <Column
            key={col.key}
            columnKey={col.key}
            label={col.label}
            dot={col.dot}
            tasks={tasksByColumn[col.key]}
            onTaskClick={setOpenTaskId}
            onQuickAdd={(title) => createTask({ title, column_id: col.key })}
          />
        ))}
      </div>

      <TaskDragOverlay activeTask={activeTask} />
      {openTaskId && (
        <TaskModal
          taskId={openTaskId}
          tasks={displayTasks}
          members={members ?? []}
          onClose={() => setOpenTaskId(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </DndContext>
  );
}
```

**Krok 5: Column.tsx — droppable z SortableContext**

```tsx
// src/components/home/kanban/Column.tsx
'use client';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskCard } from './SortableTaskCard';
import { QuickAddTask } from './QuickAddTask';
import type { Task } from '@/lib/types/home';

interface ColumnProps {
  columnKey: string;
  label: string;
  dot: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onQuickAdd: (title: string) => void;
}

export function Column({ columnKey, label, dot, tasks, onTaskClick, onQuickAdd }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnKey}`,
    data: { type: 'column', columnKey },
  });

  return (
    <section
      className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-[12px] min-w-[240px] scroll-snap-align-start"
      role="region"
      aria-label={`Kolumna: ${label}`}
    >
      {/* Header */}
      <div className="flex items-center gap-[8px] mb-[10px]">
        <div className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ background: dot }} />
        <span className="text-[12px] font-bold text-[#e6edf3] flex-1">{label}</span>
        <span className="text-[10px] font-semibold bg-[#2a2540] text-[#6b7280] px-[7px] py-[1px] rounded-[8px]">
          {tasks.length}
        </span>
      </div>

      {/* QuickAdd */}
      <QuickAddTask onAdd={onQuickAdd} />

      {/* Droppable + Sortable */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-[7px] min-h-[80px] rounded-[8px] p-[4px] transition-colors ${
            isOver ? 'bg-[rgba(124,58,237,0.1)] border border-[#4b3d7a]' : 'bg-transparent'
          }`}
        >
          {tasks.length === 0 ? (
            <EmptyColumnHint label={label} />
          ) : (
            tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function EmptyColumnHint({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[60px] text-[11px] text-[#3d3757] border border-dashed border-[#2a2540] rounded-[6px]">
      Brak zadań w "{label}"
    </div>
  );
}
```

**Krok 6: SortableTaskCard.tsx — useSortable wrapper**

```tsx
// src/components/home/kanban/SortableTaskCard.tsx
'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import type { Task } from '@/lib/types/home';

export function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} isGhost={isDragging} />
    </div>
  );
}
```

**Krok 7: TaskCard.tsx — dark theme restyling**

Zmień wszystkie klasy:
```
bg-white     → bg-[#13111c]
border-gray-200 → border-[#2a2540]
text-gray-900 → text-[#e6edf3]
text-gray-500 → text-[#6b7280]
text-gray-700 → text-[#c9d1d9]
bg-blue-100 text-blue-700 → bg-[#2d1b4a] text-[#c4b5fd]
shadow-sm    → shadow-[0_2px_8px_rgba(0,0,0,0.3)]
hover:shadow-md → hover:shadow-[0_3px_12px_rgba(0,0,0,0.4)] hover:border-[#4b3d7a]
hover:-translate-y-px
```

Priorytet badge:
```tsx
const PRIORITY_STYLES = {
  urgent: { emoji: '🔴', label: 'Pilne',   bg: '#3a1a1a', color: '#f87171' },
  high:   { emoji: '🟠', label: 'Wysoki',  bg: '#3a2a00', color: '#fbbf24' },
  medium: { emoji: '🟡', label: 'Normalne',bg: '#2a2a00', color: '#e3b341' },
  low:    { emoji: '🟢', label: 'Niski',   bg: '#1a3a1a', color: '#4ade80' },
};
```

Avatar assignee (deterministyczny kolor per user_id):
```tsx
function getAvatarColor(userId: string): string {
  const COLORS = [
    'linear-gradient(135deg,#ec4899,#f97316)', // różowy-pomarańczowy
    'linear-gradient(135deg,#3b82f6,#06b6d4)', // niebieski-cyan
    'linear-gradient(135deg,#a78bfa,#60a5fa)', // fioletowy-niebieski
    'linear-gradient(135deg,#34d399,#06b6d4)', // zielony-cyan
    'linear-gradient(135deg,#f59e0b,#ef4444)', // żółty-czerwony
  ];
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}
```

**Krok 8: FilterBar.tsx — nowy komponent zamiast FilterSidebar z archive/**

FilterSidebar z archive/ był slideover — zastąp go poziomym paskiem chipów (zgodnie z mockupem):

```tsx
// src/components/home/kanban/FilterBar.tsx
'use client';
import type { HouseholdMember } from '@/lib/types/home';

interface FilterBarProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  members: HouseholdMember[];
}

export function FilterBar({ selectedFilter, onFilterChange, members }: FilterBarProps) {
  const filters = [
    { key: 'all',  label: 'Wszystkie' },
    { key: 'mine', label: 'Moje' },
    ...members.map(m => ({ key: m.id, label: m.display_name })),
  ];

  return (
    <div className="flex gap-[5px] mb-[16px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: 'none' }}>
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          className={`px-[12px] py-[5px] text-[11px] rounded-[20px] border whitespace-nowrap transition-colors cursor-pointer ${
            selectedFilter === f.key
              ? 'bg-[#2d1b4a] border-[#7c3aed] text-[#c4b5fd] font-semibold'
              : 'bg-[#2a2540] border-[#3b3d7a] text-[#6b7280] hover:text-[#e6edf3]'
          }`}
          aria-pressed={selectedFilter === f.key}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
```

**Krok 9: QuickAddTask.tsx — dark theme**

```tsx
// src/components/home/kanban/QuickAddTask.tsx
'use client';
import { useState } from 'react';

export function QuickAddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleAdd = async () => {
    if (!value.trim()) return;
    setIsPending(true);
    await onAdd(value.trim());
    setValue('');
    setIsPending(false);
  };

  return (
    <div className="flex gap-[6px] mb-[10px]">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="Szybkie zadanie..."
        disabled={isPending}
        className="flex-1 bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[6px] text-[12px] text-[#e6edf3] placeholder-[#3d3757] outline-none focus:border-[#7c3aed] transition-colors"
        aria-label="Tytuł nowego zadania"
      />
      <button
        onClick={handleAdd}
        disabled={!value.trim() || isPending}
        className="w-[28px] h-[28px] bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-[7px] text-white text-[14px] flex items-center justify-center flex-shrink-0 disabled:opacity-40 cursor-pointer"
        aria-label="Dodaj zadanie"
      >
        +
      </button>
    </div>
  );
}
```

**Krok 10: TaskModal.tsx — dark theme + save/delete**

Modal z pełnymi danymi zadania. Klasy do zastąpienia jak w kroku 7. Dodaj:
- `background: #1a1730; border: 1px solid #3b3d7a; border-radius: 14px`
- Backdrop: `background: rgba(0,0,0,0.65); backdrop-filter: blur(4px)`
- Przycisk "Zapisz" — gradient fioletowy; "Usuń" — bg-[#3a1a1a] text-[#f87171]
- Escape zamyka modal (useEffect + keydown listener)

**Krok 11: Strona `/home/tasks/page.tsx`**

```tsx
// src/app/home/tasks/page.tsx
import { Board } from '@/components/home/kanban/Board';

export default function TasksPage() {
  return (
    <div className="p-[18px]">
      <div className="flex items-center gap-[10px] mb-[16px]">
        <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">✅ Tablica zadań</h2>
        <button className="px-[16px] py-[7px] bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] text-white text-[12px] font-semibold rounded-[8px] flex items-center gap-[6px]">
          ➕ Nowe zadanie
        </button>
      </div>
      <Board />
    </div>
  );
}
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `Board` | Container/Orchestrator | `useTasks()`, `useHousehold()`, `useUser()` | loading (skeleton), error, filled |
| `Column` | Droppable section | `columnKey, label, dot, tasks, onTaskClick, onQuickAdd` | isOver (highlighted), empty |
| `SortableTaskCard` | Sortable wrapper | `task: Task, onClick` | isDragging (ghost), normal |
| `TaskCard` | Presentation | `task, isDragging, isGhost` | default, done (opacity 0.7), dragging |
| `TaskDragOverlay` | DragOverlay | `activeTask: Task \| null` | hidden (null), visible podczas drag |
| `QuickAddTask` | Form | `onAdd: (title) => void` | idle, pending |
| `FilterBar` | Filter chips | `selectedFilter, onFilterChange, members` | — |
| `TaskModal` | Modal | `taskId, tasks, members, onClose, onUpdate, onDelete` | idle, saving, deleting |
| `BoardSkeleton` | Loading state | `columns: number` | — |

### Stany widoku

**Loading:**  
3 prostokąty skeleton `bg-[#1a1730] border border-[#2a2540] rounded-[10px]` w grid 3-kolumnowym, każdy z belką nagłówkową + 3 kartami-szkieletami animate-pulse.

**Empty (brak zadań w kolumnie):**  
`EmptyColumnHint` — prostokąt z przerywanymi krawędziami `border-dashed border-[#2a2540] border rounded-[6px] h-[60px]`, tekst "Brak zadań w {label}" `text-[11px] text-[#3d3757]`.

**Error (błąd serwera):**  
"⚠️ Nie udało się załadować tablicy zadań" + opis błędu + przycisk "Spróbuj ponownie" `bg-[#2a2540] hover:bg-[#3b3d7a]`.

**Filled (normalny stan):**  
FilterBar (poziome chipy) → 3 kolumny kanban (desktop: grid, mobile: flex scroll) z kartami zadań i QuickAddTask w każdej kolumnie.

### Responsive / Dostępność

- Mobile (375px+): `kanban-scroll` — `display: flex; overflow-x: auto; scroll-snap-type: x mandatory`; kolumna `min-width: 240px; scroll-snap-align: start`; FilterBar chips `overflow-x: auto; scrollbar-width: none`; min-height 44px dla wszystkich interaktywnych elementów; FAB "+" sticky dla "Nowe zadanie"
- Desktop (1280px+): grid `grid-template-columns: repeat(3, 1fr)` z gap 14px
- Keyboard: Tab przez filtry i karty; Enter na filtrze = aktywuje; Enter na QuickAddTask input = dodaje; Escape zamyka TaskModal
- ARIA: `Column` ma `role="region" aria-label="Kolumna: {label}"`; FilterBar button ma `aria-pressed={isActive}`; TaskModal ma `role="dialog" aria-modal="true" aria-labelledby="task-modal-title"`; drag overlay nie wpływa na screen readera (aria-hidden)

---

## ⚠️ Edge Cases

### EC-1: Drag między kolumnami gdy API jest offline
Scenariusz: Użytkownik przeciąga kartę — internet pada po handleDragEnd ale przed API response  
Oczekiwane zachowanie: Karta zostaje w nowej kolumnie przez optimisticTasks; po timeout API (np. 10s) catch wywołuje rollback; `setOptimisticTasks(null)`; karta wraca do starej kolumny  
Komunikat dla użytkownika: Toast (sonner): "Nie udało się przenieść zadania. Spróbuj ponownie."

### EC-2: Jednoczesna edycja — inny użytkownik przenosi tę samą kartę
Scenariusz: Mariusz przeciąga "Zapłać rachunki" do "W trakcie" w tym samym czasie co Angelika  
Oczekiwane zachowanie: Real-time subscription z useTasks() (STORY-4.3) triggeruje refetch; optimisticTasks jest null (lub zgodne z real-time); UI się uaktualnia  
Komunikat dla użytkownika: brak (cichy update)

### EC-3: Pusta kolumna — upuszczenie karty na pustą kolumnę
Scenariusz: Kolumna "W trakcie" jest pusta; użytkownik próbuje przeciągnąć kartę na nią  
Oczekiwane zachowanie: `useDroppable` na `column-in_progress` triggeruje `isOver: true` → highlight; po puszczeniu `handleDragEnd` odczytuje `over.data.current.type === 'column'` i targetColumnId = 'in_progress'; `moveTask` wywołane prawidłowo  
Komunikat dla użytkownika: brak

### EC-4: Filtr "Moje" gdy user nie jest przypisany do żadnego zadania
Scenariusz: Użytkownik klika "Moje" ale nie ma żadnych zadań z `assignee_id === currentUser.id`  
Oczekiwane zachowanie: Wszystkie kolumny pokazują `EmptyColumnHint`; FilterBar pokazuje "Moje" jako aktywne  
Komunikat dla użytkownika: EmptyColumnHint w każdej kolumnie: "Brak zadań w '{label}'"

### EC-5: Usunięcie zadania przez innego użytkownika podczas drag
Scenariusz: Podczas gdy użytkownik przeciąga kartę "X", Mariusz usuwa to zadanie  
Oczekiwane zachowanie: `handleDragEnd` wywołuje `moveTask(deletedId, column)` → API zwraca 404 → rollback; `optimisticTasks = null`; real-time subscription usunie kartę z listy  
Komunikat dla użytkownika: Toast: "Nie udało się przenieść zadania — mogło zostać usunięte."

---

## 🚫 Out of Scope tej Story
- Reorderowanie zadań w obrębie tej samej kolumny (sortowanie pozycji — osobna story)
- FilterSidebar z presetami (z archive/) — zastąpiony prostszym FilterBar z chipami
- Etykiety (labels) — brak w STORY-4.3 typach; mogą być dodane w osobnej story
- Sub-tasklist w TaskCard (pokazywanie paska postępu subtasks) — TaskModal to ma, card nie
- Uprawnienia: tylko ADMIN może usuwać zadania innych — RBAC guard w osobnej story
- Powiadomienia push o zmianie stanu zadania (EPIC-2)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter (`next lint`) bez błędów
- [ ] `@dnd-kit/core` i `@dnd-kit/sortable` są w `package.json` i zainstalowane
- [ ] Katalog `src/components/home/kanban/` istnieje z co najmniej 9 plikami
- [ ] Strona `/home/tasks` renderuje się bez `console.error`
- [ ] Drag & drop działa na desktop (PointerSensor, distance: 8)
- [ ] Drag & drop działa na mobile (TouchSensor, delay: 250ms, tolerance: 5px)
- [ ] Optimistic update: karta przenosi się natychmiast + rollback przy błędzie API
- [ ] FilterBar: "Wszystkie" / "Moje" / per member — filtruje poprawnie
- [ ] QuickAddTask: Enter i kliknięcie "+" dodają zadanie, pole się czyści
- [ ] TaskModal: otwarcie po kliknięciu karty, zapis przez updateTask, usunięcie przez deleteTask + confirm
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading skeleton, empty EmptyColumnHint, error ErrorState, filled kanban)
- [ ] Dark theme: bg #13111c (task cards), surface #1a1730 (columns), border #2a2540, accent gradient #7c3aed→#3b82f6
- [ ] Mobile 375px: horizontal scroll kanban bez vertical overflow, touch drag działa, min-height 44px
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku
- [ ] Story review przez PO
