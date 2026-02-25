'use client'

/**
 * components/patterns/AddLessonModal.tsx
 * STORY-8.7 — Modal for adding a new Lesson (BUG / LESSON / OBS)
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAddLesson } from '@/hooks/useAddLesson'
import type { AddLessonDTO } from '@/types/patterns'

// ─── Schema ───────────────────────────────────────────────────────────────────
const addLessonSchema = z.object({
  id:         z.string().min(1, 'ID jest wymagany (np. BUG-004)').max(20).regex(/^(BUG|LESSON|OBS)-\d+$/, 'ID jest wymagany (np. BUG-004)'),
  title:      z.string().min(3, 'Tytuł jest wymagany').max(200),
  severity:   z.enum(['info', 'warning', 'critical']),
  category:   z.string().min(1, 'Kategoria jest wymagana').max(50),
  body:       z.string().min(10, 'Opis musi mieć co najmniej 10 znaków'),
  root_cause: z.string().max(500).optional().or(z.literal('')),
  fix:        z.string().max(500).optional().or(z.literal('')),
  lesson:     z.string().min(10, 'Lekcja jest wymagana (min 10 znaków)').max(500),
  tags:       z.string().optional(),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Podaj poprawną datę').optional().or(z.literal('')),
})

type AddLessonForm = z.infer<typeof addLessonSchema>

// ─── Styles ───────────────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0c1a',
  border: '1px solid #2a2540',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '13px',
  padding: '8px 12px',
  outline: 'none',
  boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: '12px',
  marginTop: '4px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '4px',
  fontWeight: 500,
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AddLessonModalProps {
  isOpen:  boolean
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AddLessonModal({ isOpen, onClose }: AddLessonModalProps) {
  const { addLesson, isLoading } = useAddLesson()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddLessonForm>({
    resolver: zodResolver(addLessonSchema),
    mode: 'onBlur',
    defaultValues: {
      severity: 'warning',
      date: new Date().toISOString().slice(0, 10),
    },
  })

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: AddLessonForm) => {
    // Parse tags
    const parsedTags = (data.tags ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10)

    const dto: AddLessonDTO = {
      id:         data.id,
      title:      data.title,
      severity:   data.severity,
      category:   data.category,
      body:       data.body,
      root_cause: data.root_cause || undefined,
      fix:        data.fix || undefined,
      lesson:     data.lesson,
      tags:       parsedTags.length > 0 ? parsedTags : undefined,
      date:       data.date || undefined,
    }

    const result = await addLesson(dto)
    if (result) {
      toast.success('✅ Lekcja zapisana do pliku', { duration: 3000 })
      reset()
      onClose()
    } else {
      toast.error('❌ Błąd zapisu — Bridge może być offline', { duration: 5000 })
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-lesson-title"
        style={{
          background: '#1a1730',
          border: '1px solid #2a2540',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2
          id="add-lesson-title"
          style={{
            margin: '0 0 20px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#e2e8f0',
          }}
        >
          + Dodaj Lesson
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* ID */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-id" style={labelStyle}>ID *</label>
            <input
              id="lesson-id"
              type="text"
              {...register('id')}
              placeholder="BUG-004"
              style={fieldStyle}
            />
            {errors.id && <p style={errorStyle}>{errors.id.message}</p>}
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-title" style={labelStyle}>Tytuł *</label>
            <input
              id="lesson-title"
              type="text"
              {...register('title')}
              placeholder="Krótki tytuł lekcji"
              style={fieldStyle}
            />
            {errors.title && <p style={errorStyle}>{errors.title.message}</p>}
          </div>

          {/* Severity */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-severity" style={labelStyle}>Severity *</label>
            <select
              id="lesson-severity"
              {...register('severity')}
              style={fieldStyle}
            >
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
            {errors.severity && <p style={errorStyle}>{errors.severity.message}</p>}
          </div>

          {/* Category */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-category" style={labelStyle}>Kategoria *</label>
            <input
              id="lesson-category"
              type="text"
              {...register('category')}
              placeholder="np. pipeline, frontend"
              style={fieldStyle}
            />
            {errors.category && <p style={errorStyle}>{errors.category.message}</p>}
          </div>

          {/* Body — Co poszło nie tak */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-body" style={labelStyle}>Co poszło nie tak *</label>
            <textarea
              id="lesson-body"
              rows={3}
              {...register('body')}
              placeholder="Opisz co się stało…"
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
            {errors.body && <p style={errorStyle}>{errors.body.message}</p>}
          </div>

          {/* Root cause */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-root-cause" style={labelStyle}>Root cause (opcjonalnie)</label>
            <textarea
              id="lesson-root-cause"
              rows={2}
              {...register('root_cause')}
              placeholder="Dlaczego to się stało?"
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
            {errors.root_cause && <p style={errorStyle}>{errors.root_cause.message}</p>}
          </div>

          {/* Fix */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-fix" style={labelStyle}>Fix (opcjonalnie)</label>
            <textarea
              id="lesson-fix"
              rows={2}
              {...register('fix')}
              placeholder="Jak naprawiono / jak zapobiec?"
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
            {errors.fix && <p style={errorStyle}>{errors.fix.message}</p>}
          </div>

          {/* Lesson */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-lesson" style={labelStyle}>Lekcja *</label>
            <textarea
              id="lesson-lesson"
              rows={3}
              {...register('lesson')}
              placeholder="Czego się nauczyliśmy? Co zrobimy inaczej?"
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
            {errors.lesson && <p style={errorStyle}>{errors.lesson.message}</p>}
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="lesson-tags" style={labelStyle}>Tagi (opcjonalnie)</label>
            <input
              id="lesson-tags"
              type="text"
              {...register('tags')}
              placeholder="pipeline, glm-5"
              style={fieldStyle}
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="lesson-date" style={labelStyle}>Data</label>
            <input
              id="lesson-date"
              type="date"
              {...register('date')}
              style={fieldStyle}
            />
            {errors.date && <p style={errorStyle}>{errors.date.message}</p>}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: '1px solid #2a2540',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: isLoading ? '#4b4569' : '#818cf8',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isLoading && (
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.6s linear infinite',
                  }}
                  aria-hidden="true"
                />
              )}
              Zapisz
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
