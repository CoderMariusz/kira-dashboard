'use client'

/**
 * components/patterns/AddPatternModal.tsx
 * STORY-8.7 — Modal for adding a new Pattern or Anti-Pattern
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAddPattern } from '@/hooks/useAddPattern'
import type { AddPatternDTO } from '@/types/patterns'

// ─── Schema ───────────────────────────────────────────────────────────────────
const addPatternSchema = z.object({
  type:            z.enum(['PATTERN', 'ANTI_PATTERN']),
  category:        z.string().min(1, 'Kategoria jest wymagana (max 50 znaków)').max(50),
  text:            z.string().min(3, 'Treść wzorca jest wymagana (min 3, max 500 znaków)').max(500),
  model:           z.string().max(30).optional().or(z.literal('')),
  domain:          z.string().max(30).optional().or(z.literal('')),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Podaj poprawną datę').optional().or(z.literal('')),
  related_stories: z.string().optional(),
})

type AddPatternForm = z.infer<typeof addPatternSchema>

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
interface AddPatternModalProps {
  isOpen:  boolean
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AddPatternModal({ isOpen, onClose }: AddPatternModalProps) {
  const { addPattern, isLoading } = useAddPattern()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPatternForm>({
    resolver: zodResolver(addPatternSchema),
    mode: 'onBlur',
    defaultValues: {
      type: 'PATTERN',
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

  const onSubmit = async (data: AddPatternForm) => {
    // Parse related_stories
    const related = (data.related_stories ?? '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => /^STORY-\d+\.\d+$/.test(s))

    const dto: AddPatternDTO = {
      type:            data.type,
      category:        data.category,
      text:            data.text,
      model:           data.model || undefined,
      domain:          data.domain || undefined,
      date:            data.date || undefined,
      related_stories: related.length > 0 ? related : undefined,
    }

    const result = await addPattern(dto)
    if (result) {
      toast.success('✅ Wzorzec zapisany do pliku', { duration: 3000 })
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
        aria-labelledby="add-pattern-title"
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
          id="add-pattern-title"
          style={{
            margin: '0 0 20px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#e2e8f0',
          }}
        >
          + Dodaj Pattern
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Type */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="pattern-type" style={labelStyle}>Typ *</label>
            <select
              id="pattern-type"
              {...register('type')}
              style={fieldStyle}
            >
              <option value="PATTERN">PATTERN</option>
              <option value="ANTI_PATTERN">ANTI_PATTERN</option>
            </select>
            {errors.type && <p style={errorStyle}>{errors.type.message}</p>}
          </div>

          {/* Category */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="pattern-category" style={labelStyle}>Kategoria *</label>
            <input
              id="pattern-category"
              type="text"
              {...register('category')}
              placeholder="np. pipeline, frontend, backend"
              style={fieldStyle}
            />
            {errors.category && <p style={errorStyle}>{errors.category.message}</p>}
          </div>

          {/* Text */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="pattern-text" style={labelStyle}>Treść wzorca *</label>
            <textarea
              id="pattern-text"
              rows={4}
              {...register('text')}
              placeholder="Opisz wzorzec lub antywzorzec…"
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
            {errors.text && <p style={errorStyle}>{errors.text.message}</p>}
          </div>

          {/* Model */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="pattern-model" style={labelStyle}>Model (opcjonalnie)</label>
            <input
              id="pattern-model"
              type="text"
              {...register('model')}
              placeholder="np. claude-sonnet-4-6"
              style={fieldStyle}
            />
            {errors.model && <p style={errorStyle}>{errors.model.message}</p>}
          </div>

          {/* Domain */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="pattern-domain" style={labelStyle}>Domena (opcjonalnie)</label>
            <input
              id="pattern-domain"
              type="text"
              {...register('domain')}
              placeholder="np. kira-dashboard"
              style={fieldStyle}
            />
            {errors.domain && <p style={errorStyle}>{errors.domain.message}</p>}
          </div>

          {/* Date */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="pattern-date" style={labelStyle}>Data</label>
            <input
              id="pattern-date"
              type="date"
              {...register('date')}
              style={fieldStyle}
            />
            {errors.date && <p style={errorStyle}>{errors.date.message}</p>}
          </div>

          {/* Related stories */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="pattern-related" style={labelStyle}>Powiązane stories (opcjonalnie)</label>
            <input
              id="pattern-related"
              type="text"
              {...register('related_stories')}
              placeholder="STORY-8.1, STORY-8.2"
              style={fieldStyle}
            />
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
