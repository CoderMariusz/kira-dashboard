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
  isDeferredMode?: boolean;
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
  isDeferredMode = false,
}: FilterSidebarProps) {
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [deletePresetOpen, setDeletePresetOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<SavedPreset | null>(null);
  const [pendingFilters, setPendingFilters] = useState<FilterState>(filters);

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

  // Sync pending filters when sidebar opens or filters change
  useEffect(() => {
    setPendingFilters(filters);
  }, [filters, open]);

  const updateFilter = (key: keyof FilterState, value: FilterState[typeof key]) => {
    if (isDeferredMode) {
      setPendingFilters({ ...pendingFilters, [key]: value });
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const toggleLabelFilter = (labelId: string) => {
    const currentFilters = isDeferredMode ? pendingFilters : filters;
    const newLabels = toggleInArray(currentFilters.labels, labelId);
    updateFilter('labels', newLabels);
  };

  const togglePriorityFilter = (priority: string) => {
    const currentFilters = isDeferredMode ? pendingFilters : filters;
    const newPriorities = toggleInArray(currentFilters.priorities, priority);
    updateFilter('priorities', newPriorities);
  };

  const toggleAssigneeFilter = (assigneeId: string) => {
    const currentFilters = isDeferredMode ? pendingFilters : filters;
    const newAssignees = toggleInArray(currentFilters.assignees, assigneeId);
    updateFilter('assignees', newAssignees);
  };

  const clearAllFilters = () => {
    const cleared = {
      labels: [],
      priorities: [],
      assignees: [],
      search: '',
    };
    if (isDeferredMode) {
      setPendingFilters(cleared);
    } else {
      onFiltersChange(cleared);
    }
  };

  const applyFilters = () => {
    onFiltersChange(pendingFilters);
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

  // Use pending filters in deferred mode, actual filters otherwise
  const displayFilters = isDeferredMode ? pendingFilters : filters;

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
        className="relative ml-auto w-80 max-w-full bg-white shadow-lg overflow-y-auto flex flex-col"
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

        <div className="flex-1 space-y-4 p-4 overflow-y-auto">
          {/* Search */}
          <div className="space-y-2">
            <Label>Szukaj</Label>
            <Input
              type="search"
              placeholder="Szukaj w tytułach..."
              value={displayFilters.search}
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
                    checked={displayFilters.labels.includes(label.id)}
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
                    checked={displayFilters.priorities.includes(priority.value)}
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
                    checked={displayFilters.assignees.includes(assignee.id)}
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
            aria-label="Wyczyść wszystko"
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

        {/* Action Buttons - Sticky Footer */}
        {isDeferredMode && (
          <div className="sticky bottom-0 border-t bg-white p-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={clearAllFilters}
              aria-label="Resetuj"
            >
              Resetuj
            </Button>
            <Button
              className="flex-1"
              onClick={applyFilters}
              aria-label="Zastosuj filtry"
            >
              Zastosuj
            </Button>
          </div>
        )}
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
