'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Board } from '@/components/kanban/Board';
import { useUIStore } from '@/lib/store';

export default function HomePage() {
  const openTaskModal = useUIStore((s) => s.openTaskModal);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🏠 Dom</h1>
        <Button size="sm" onClick={() => openTaskModal()} className="gap-1">
          <Plus className="h-4 w-4" />
          Dodaj zadanie
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1">
        <Board type="home" />
      </div>
    </div>
  );
}
