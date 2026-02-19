'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Subtask {
  title: string;
  done: boolean;
}

interface SubtaskListProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
  /** Tryb readonly — w widoku szczegółów */
  readOnly?: boolean;
}

export function SubtaskList({ subtasks, onChange, readOnly }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');

  // ═══ ADD ═══
  const addSubtask = () => {
    if (!newTitle.trim()) return;
    onChange([...subtasks, { title: newTitle.trim(), done: false }]);
    setNewTitle('');
  };

  // ═══ TOGGLE ═══
  const toggleSubtask = (index: number) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], done: !updated[index].done };
    onChange(updated);
  };

  // ═══ DELETE ═══
  const deleteSubtask = (index: number) => {
    onChange(subtasks.filter((_, i) => i !== index));
  };

  // ═══ PROGRESS ═══
  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="h-1.5 flex-1 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width: `${subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span>
            {doneCount}/{subtasks.length}
          </span>
        </div>
      )}

      {/* Lista subtasków */}
      <div className="space-y-1">
        {subtasks.map((subtask, index) => (
          <div
            key={index}
            className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={subtask.done}
              onChange={() => toggleSubtask(index)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={readOnly}
            />
            <span
              className={cn(
                'flex-1 text-sm',
                subtask.done && 'text-gray-400 line-through'
              )}
            >
              {subtask.title}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => deleteSubtask(index)}
                className="invisible text-gray-400 hover:text-red-500 group-hover:visible"
                aria-label={`Usuń subtask: ${subtask.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input do dodawania nowego subtaska */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              }
            }}
            placeholder="Dodaj podpunkt..."
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addSubtask}
            disabled={!newTitle.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
