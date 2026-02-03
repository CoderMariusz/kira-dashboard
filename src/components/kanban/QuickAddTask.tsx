'use client';

import { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/lib/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import type { TaskColumn } from '@/lib/types/app';

interface QuickAddTaskProps {
  boardId: string;
  column: TaskColumn;
}

export function QuickAddTask({ boardId, column }: QuickAddTaskProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const createTask = useCreateTask();
  const { toast } = useToast();

  // ═══ OPEN ═══
  const startAdding = () => {
    setIsAdding(true);
    // Focus input po renderze
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ═══ SUBMIT ═══
  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      await createTask.mutateAsync({
        board_id: boardId,
        title: trimmed,
        column,
      });

      setTitle('');
      // Zostań w trybie dodawania — pozwala szybko dodać kilka tasków
      inputRef.current?.focus();
    } catch (error) {
      toast({
        title: '❌ Błąd',
        description: 'Nie udało się dodać zadania',
        variant: 'destructive',
      });
    }
  };

  // ═══ CANCEL ═══
  const cancelAdding = () => {
    setIsAdding(false);
    setTitle('');
  };

  // ═══ RENDER — przycisk "+" ═══
  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={startAdding}
        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
        aria-label="Dodaj zadanie"
      >
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  // ═══ RENDER — input inline ═══
  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            cancelAdding();
          }
        }}
        onBlur={() => {
          // Jeśli puste — zamknij. Jeśli coś wpisane — zostaw.
          if (!title.trim()) {
            cancelAdding();
          }
        }}
        placeholder="Tytuł zadania..."
        className="h-7 text-xs"
        disabled={createTask.isPending}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={cancelAdding}
        className="h-7 w-7 p-0 text-gray-400"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
