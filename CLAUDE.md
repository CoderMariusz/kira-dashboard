# CLAUDE.md — Kira Dashboard

## Projekt

**Kira Dashboard** — Family task management z Kanban boards i shopping lists.

**Tech Stack:**
- Next.js 16 (App Router, Turbopack)
- Supabase (Auth, PostgreSQL, Realtime)
- React Query (TanStack Query)
- Zustand (UI state)
- @dnd-kit (drag & drop)
- Framer Motion (animations)
- shadcn/ui + Tailwind CSS
- Zod (validation)
- React Hook Form

## Aktualny Sprint

### Ukończone
- [x] **Epic 1: Infrastructure Setup** (US-1.1, US-1.2, US-1.3)
- [x] **Epic 2: Kanban Board** (US-2.1, US-2.2, US-2.3, US-2.4, US-2.5)

### W toku
- [ ] **Epic 3: Shopping List**

## Kluczowe pliki Epic 2

| Plik | Opis |
|------|------|
| `components/kanban/Board.tsx` | DndContext wrapper, dynamiczne kolumny, drag handlers |
| `components/kanban/Column.tsx` | Droppable column z SortableContext |
| `components/kanban/TaskCard.tsx` | Karta zadania z priority, labels, due date, assignee |
| `components/kanban/TaskModal.tsx` | Dialog create/edit z TaskForm |
| `components/kanban/TaskForm.tsx` | React Hook Form + Zod: title, desc, priority, column, due_date, labels, subtasks |
| `components/kanban/QuickAddTask.tsx` | Inline quick add w header kolumny |
| `components/kanban/SortableTaskCard.tsx` | useSortable wrapper + Framer Motion |
| `components/kanban/ConfirmDialog.tsx` | Reusable dialog potwierdzenia |
| `lib/hooks/useTasks.ts` | React Query: useTasks, useTask, useCreateTask, useUpdateTask, useMoveTask, useDeleteTask |
| `lib/hooks/useBoard.ts` | React Query: useBoard, useBoards |
| `lib/hooks/useRealtime.ts` | Supabase realtime → cache invalidation |
| `lib/validations/task.ts` | Zod schema: taskFormSchema |

## Struktura projektu

```
src/
├── app/
│   ├── (auth)/           # Login pages
│   ├── (dashboard)/      # Protected pages (home, work, shopping, activity)
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout with Providers
├── components/
│   ├── kanban/           # Kanban board components
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── hooks/            # React Query hooks
│   ├── supabase/         # Supabase client/server
│   ├── store/            # Zustand store
│   ├── types/            # TypeScript types
│   ├── utils/            # Constants, helpers
│   └── validations/      # Zod schemas
└── hooks/                # Custom hooks (use-toast)
```

## Konwencje

- Folder structure: `src/`
- Komponenty: PascalCase (`TaskCard.tsx`)
- Hooks: camelCase z `use` prefix (`useTasks.ts`)
- Wszystkie komponenty `'use client'` gdzie potrzebne
- Supabase client: `createClient()` per-request (nie singleton)
- Optimistic updates w mutacjach React Query
- Toast via sonner (wrapper w `hooks/use-toast.ts`)

## Deployment

- **Vercel**: Auto-deploy z `main` branch
- **Supabase**: Production project `cavihzxpsltcwlueohsc`
