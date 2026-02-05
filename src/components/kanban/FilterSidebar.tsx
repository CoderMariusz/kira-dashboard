/**
 * FilterSidebar Component
 * Kira Dashboard - Sidebar for filtering tasks with saved presets
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/kanban/ConfirmDialog';
import { toast } from 'sonner';
import { toggleInArray, localStorage } from '@/lib/utils/array';
import type { FilterState } from '@/lib/types/filters';
import type { Label as LabelType, Profile } from '@/lib/types/app';

interface FilterSidebarProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  labels: LabelType[];
  assignees: (Pick<Profile, 'id' | 'display_name'>)[];
}

interface SavedPreset {
  id: string;
  name: string;
  filters: FilterState;
}

const PRIORITIES = [
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
  { value: 'urgent', label: 'Pilny' },
];

const STORAGE_KEY = 'filter-presets';

export function FilterSidebar({
  open,
  onClose,
  filters,
  onFiltersChange,
  labels,
  assignees,
}: FilterSidebarProps) {
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [deletePresetOpen, setDeletePresetOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<SavedPreset | null>(null);

  // Load presets from localStorage on client side only
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch {
        setPresets([]);
      }
    }
  }, []);

  const updateFilter = (key: keyof FilterState, value: FilterState[typeof key]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleLabelFilter = (labelId: string) => {
    updateFilter('labels', toggleInArray(filters.labels, labelId));
  };

  const togglePriorityFilter = (priority: string) => {
    updateFilter('priorities', toggleInArray(filters.priorities, priority));
  };

  const toggleAssigneeFilter = (assigneeId: string) => {
    updateFilter('assignees', toggleInArray(filters.assignees, assigneeId));
  };

  const clearAllFilters = () => {
    onFiltersChange({
      labels: [],
      priorities: [],
      assignees: [],
      search: '',
    });
  };

  const savePreset = () => {
    if (!presetName.trim()) {
      (toast as unknown as (opts: { variant: string; title: string }) => void)({ variant: 'error', title: 'Nazwa|Name presetu jest wymagana' });
      return;
    }

    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setPresetName('');
  };

  const loadPreset = (preset: SavedPreset) => {
    onFiltersChange({ ...preset.filters });
  };

  const handleDeletePreset = (preset: SavedPreset) => {
    setPresetToDelete(preset);
    setDeletePresetOpen(true);
  };

  const confirmDeletePreset = () => {
    if (presetToDelete) {
      const updated = presets.filter((p) => p.id !== presetToDelete.id);
      setPresets(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setDeletePresetOpen(false);
      setPresetToDelete(null);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sidebar */}
      <div
        className="relative ml-auto w-80 max-w-full bg-white shadow-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
          <h2 className="font-semibold">Filtry</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Zamknij filtry"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Szukaj</Label>
            <Input
              type="search"
              placeholder="Szukaj w tytułach..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              aria-label="Szukaj"
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Etykiety</Label>
            <div className="space-y-1">
              {labels.map((label) => (
                <label key={label.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.labels.includes(label.id)}
                    onChange={() => toggleLabelFilter(label.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{label.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div className="space-y-2">
            <Label>Priorytet</Label>
            <div className="space-y-1">
              {PRIORITIES.map((priority) => (
                <label key={priority.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(priority.value)}
                    onChange={() => togglePriorityFilter(priority.value)}
                    className="rounded"
                  />
                  <span className="text-sm">{priority.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>Przypisane do</Label>
            <div className="space-y-1">
              {assignees.map((assignee) => (
                <label key={assignee.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.assignees.includes(assignee.id)}
                    onChange={() => toggleAssigneeFilter(assignee.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{assignee.display_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear All Button */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={clearAllFilters}
          >
            Wyczyść wszystko
          </Button>

          {/* Presets Section */}
          <div className="border-t pt-4 space-y-2">
            <Label>Presets</Label>
            <div className="flex gap-1">
              <Input
                placeholder="Nazwa presetu..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                aria-label="Nazwa"
                className="text-sm"
              />
              <Button size="sm" onClick={savePreset} aria-label="Zapisz preset">
                Zapisz preset
              </Button>
            </div>

            {/* Saved presets list */}
            <div className="space-y-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between rounded-sm border bg-gray-50 p-2 text-sm"
                >
                  <button
                    onClick={() => loadPreset(preset)}
                    className="flex-1 text-left hover:text-blue-600"
                  >
                    {preset.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePreset(preset)}
                    aria-label={`Usuń preset ${preset.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete preset confirmation */}
      <ConfirmDialog
        open={deletePresetOpen}
        onClose={() => setDeletePresetOpen(false)}
        title="Czy na pewno?"
        description={`Usunąć preset "${presetToDelete?.name}"?`}
        onConfirm={confirmDeletePreset}
        confirmLabel="Usuń"
      />
    </div>
  );
}
