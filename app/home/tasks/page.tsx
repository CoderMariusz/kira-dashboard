// app/home/tasks/page.tsx
// Strona tablicy zadań kanban — AC-1

import { Board } from '@/components/home/kanban/Board'

export default function TasksPage() {
  return (
    <div className="p-[18px]">
      {/* Nagłówek + przycisk Nowe zadanie */}
      <div className="flex items-center gap-[10px] mb-[16px]">
        <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">
          ✅ Tablica zadań
        </h2>
        <button
          className="px-[16px] py-[7px] bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] text-white text-[12px] font-semibold rounded-[8px] flex items-center gap-[6px] cursor-pointer"
          aria-label="Dodaj nowe zadanie"
        >
          ➕ Nowe zadanie
        </button>
      </div>

      {/* Tablica kanban */}
      <Board />
    </div>
  )
}
