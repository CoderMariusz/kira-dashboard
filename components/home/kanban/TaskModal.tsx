'use client'

// components/home/kanban/TaskModal.tsx
// Modal edycji zadania — AC-8

import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskUpdate, HouseholdMember, ColumnWithTasks } from '@/types/home'

interface TaskModalProps {
  task: Task
  columns: ColumnWithTasks[]
  members: HouseholdMember[]
  onClose: () => void
  onUpdate: (taskId: string, updates: TaskUpdate) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

type MemberWithName = HouseholdMember & { display_name?: string; full_name?: string }

function getMemberLabel(member: HouseholdMember): string {
  const m = member as MemberWithName
  if (m.display_name) return m.display_name
  if (m.full_name) return m.full_name
  return m.user_id.slice(0, 8)
}

export function TaskModal({
  task,
  columns,
  members,
  onClose,
  onUpdate,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState(task.priority)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [columnId, setColumnId] = useState(task.column_id)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Zamknij na Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Zablokuj scroll tła
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSave = useCallback(async () => {
    if (!title.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        assigned_to: assignedTo || null,
        column_id: columnId,
        due_date: dueDate || null,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }, [task.id, title, description, priority, assignedTo, columnId, dueDate, isSaving, onUpdate, onClose])

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Usunąć zadanie "${task.title}"?`)) return
    setIsDeleting(true)
    try {
      await onDelete(task.id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }, [task.id, task.title, onDelete, onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="task-modal-title"
    >
      {/* Modal */}
      <div
        className="w-full max-w-[500px] max-h-[85vh] overflow-y-auto flex flex-col"
        style={{
          background: '#1a1730',
          border: '1px solid #3b3d7a',
          borderRadius: '14px',
          padding: '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Nagłówek */}
        <div className="flex items-center justify-between mb-[16px]">
          <h2
            id="task-modal-title"
            className="text-[16px] font-bold text-[#e6edf3]"
          >
            Edytuj zadanie
          </h2>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#e6edf3] transition-colors text-[20px] leading-none cursor-pointer"
            aria-label="Zamknij modal"
          >
            ×
          </button>
        </div>

        {/* Pola formularza */}
        <div className="flex flex-col gap-[12px]">
          {/* Tytuł */}
          <div>
            <label className="text-[11px] text-[#6b7280] mb-[4px] block">Tytuł *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[8px] text-[13px] text-[#e6edf3] outline-none focus:border-[#7c3aed] transition-colors"
              placeholder="Tytuł zadania..."
            />
          </div>

          {/* Opis */}
          <div>
            <label className="text-[11px] text-[#6b7280] mb-[4px] block">Opis</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[8px] text-[13px] text-[#e6edf3] outline-none focus:border-[#7c3aed] transition-colors resize-none"
              placeholder="Opis zadania..."
            />
          </div>

          {/* Priorytet + Kolumna — wiersz */}
          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className="text-[11px] text-[#6b7280] mb-[4px] block">Priorytet</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Task['priority'])}
                className="w-full bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[8px] text-[13px] text-[#e6edf3] outline-none focus:border-[#7c3aed] transition-colors cursor-pointer"
              >
                <option value="low">🟢 Niski</option>
                <option value="medium">🟡 Normalny</option>
                <option value="high">🟠 Wysoki</option>
                <option value="urgent">🔴 Pilny</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7280] mb-[4px] block">Kolumna</label>
              <select
                value={columnId}
                onChange={e => setColumnId(e.target.value)}
                className="w-full bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[8px] text-[13px] text-[#e6edf3] outline-none focus:border-[#7c3aed] transition-colors cursor-pointer"
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Przypisano + Data */}
          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className="text-[11px] text-[#6b7280] mb-[4px] block">Przypisano do</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[8px] text-[13px] text-[#e6edf3] outline-none focus:border-[#7c3aed] transition-colors cursor-pointer"
              >
                <option value="">— Nieprzypisane —</option>
                {members.map(m => (
                  <option key={m.id} value={m.user_id}>
                    {getMemberLabel(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7280] mb-[4px] block">Termin</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[8px] text-[13px] text-[#e6edf3] outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Przyciski akcji */}
        <div className="flex items-center justify-between mt-[20px] pt-[16px] border-t border-[#2a2540]">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="text-[12px] text-[#f87171] bg-[#3a1a1a] px-[12px] py-[7px] rounded-[7px] hover:bg-[#4a2020] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? 'Usuwanie...' : '🗑️ Usuń zadanie'}
          </button>

          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={onClose}
              className="text-[12px] text-[#6b7280] bg-[#2a2540] px-[12px] py-[7px] rounded-[7px] hover:bg-[#3b3d7a] transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!title.trim() || isSaving}
              className="text-[12px] text-white bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] px-[16px] py-[7px] rounded-[7px] disabled:opacity-50 cursor-pointer font-semibold"
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
