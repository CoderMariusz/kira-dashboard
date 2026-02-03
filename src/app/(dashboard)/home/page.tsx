'use client';

import { Board } from '@/components/kanban/Board';

export default function HomePage() {
  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🏠 Dom</h1>
      </div>

      {/* Kanban board */}
      <div className="flex-1">
        <Board type="home" />
      </div>
    </div>
  );
}
