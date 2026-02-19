'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRIORITIES, BOARD_COLUMNS } from '@/lib/utils/constants';
import { toggleInArray } from '@/lib/utils/array';
import {
  taskFormSchema,
  defaultTaskValues,
  type TaskFormValues,
} from '@/lib/validations/task';
import { LabelBadge } from './LabelBadge';
import { SubtaskList } from './SubtaskList';
import { useLabels } from '@/lib/hooks/useLabels';
import { useHousehold } from '@/lib/hooks/useHousehold';
import type { BoardType, Label as LabelType } from '@/lib/types/app';

interface TaskFormProps {
  /** Początkowe wartości (dla edycji — US-2.4) */
  initialValues?: Partial<TaskFormValues>;
  /** Typ boardu — determinuje dostępne kolumny */
  boardType: BoardType;
  /** Czy formularz jest w trakcie submit */
  isSubmitting?: boolean;
  /** Callback po submit */
  onSubmit: (values: TaskFormValues) => void;
  /** Callback cancel */
  onCancel: () => void;
}

export function TaskForm({
  initialValues,
  boardType,
  isSubmitting,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  // ═══ DATA ═══
  const { data: household } = useHousehold();
  const { data: dbLabels = [] } = useLabels(household?.id);

  // ═══ FORM ═══
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      ...defaultTaskValues,
      ...initialValues,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Watch labels - now contains label IDs (strings)
  const currentLabelIds = watch('labels') ?? [];
  const currentSubtasks = watch('subtasks') ?? [];

  // Kolumny dostępne dla tego boardu
  const availableColumns = BOARD_COLUMNS[boardType];

  // ═══ LABEL MANAGEMENT ═══
  const toggleLabel = (labelId: string) => {
    setValue('labels', toggleInArray(currentLabelIds, labelId));
  };

  // Map label IDs to Label objects for display
  const selectedLabels: LabelType[] = currentLabelIds
    .map((id) => dbLabels.find((l) => l.id === id))
    .filter((l): l is LabelType => l !== undefined);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ═══ TITLE ═══ */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Tytuł *</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Np. Naprawić kran w kuchni"
          autoFocus
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* ═══ DESCRIPTION ═══ */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Opis</Label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Opcjonalny opis zadania..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* ═══ ROW: PRIORITY + COLUMN ═══ */}
      <div className="grid grid-cols-2 gap-4">
        {/* Priority */}
        <div className="space-y-1.5">
          <Label>Priorytet</Label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz priorytet" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span style={{ color: config.color }}>{config.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Column */}
        <div className="space-y-1.5">
          <Label>Kolumna</Label>
          <Controller
            name="column"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kolumnę" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col.key} value={col.key}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* ═══ DUE DATE ═══ */}
      <div className="space-y-1.5">
        <Label htmlFor="due_date">Termin</Label>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="due_date"
            type="datetime-local"
            {...register('due_date')}
            className="pl-10"
          />
        </div>
      </div>

      {/* ═══ LABELS ═══ */}
      <div className="space-y-1.5">
        <Label>Etykiety</Label>
        
        {/* Selected labels display */}
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedLabels.map((label) => (
              <LabelBadge
                key={label.id}
                label={label}
                onRemove={() => toggleLabel(label.id)}
              />
            ))}
          </div>
        )}

        {/* Available labels as selectable options */}
        {dbLabels.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            {dbLabels.map((label) => (
              <label
                key={label.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={currentLabelIds.includes(label.id)}
                  onChange={() => toggleLabel(label.id)}
                  className="rounded"
                />
                <LabelBadge label={label} />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ═══ SUBTASKS ═══ */}
      <div className="space-y-1.5">
        <Label>Podpunkty</Label>
        <SubtaskList
          subtasks={currentSubtasks}
          onChange={(subtasks) => setValue('subtasks', subtasks)}
        />
      </div>

      {/* ═══ BUTTONS ═══ */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Zapisuję...'
            : initialValues?.title
              ? 'Zapisz zmiany'
              : 'Utwórz zadanie'}
        </Button>
      </div>
    </form>
  );
}
