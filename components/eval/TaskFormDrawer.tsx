'use client'

/**
 * components/eval/TaskFormDrawer.tsx
 * STORY-7.6 — Slide-in drawer for add/edit golden tasks.
 */

import { useState, useEffect } from 'react'
import { EVAL_CATEGORIES, EVAL_MODELS } from '@/lib/eval/types'
import type { EvalTask, EvalCategory, EvalModel } from '@/lib/eval/types'
import type { CreateTaskInput, UpdateTaskInput } from '@/hooks/useGoldenTasks'

interface TaskFormDrawerProps {
  open: boolean
  task?: EvalTask | null
  onClose: () => void
  onCreate: (input: CreateTaskInput) => Promise<void>
  onUpdate: (id: string, input: UpdateTaskInput) => Promise<void>
}

interface FormState {
  prompt: string
  expected_output: string
  category: EvalCategory | ''
  target_model: EvalModel | ''
  is_active: boolean
}

interface FormErrors {
  prompt?: string
  expected_output?: string
  category?: string
  target_model?: string
}

const INITIAL_FORM: FormState = {
  prompt: '',
  expected_output: '',
  category: '',
  target_model: '',
  is_active: true,
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.prompt || form.prompt.trim().length < 10) {
    errors.prompt = 'Prompt jest wymagany (min. 10 znaków)'
  }
  if (!form.expected_output || form.expected_output.trim().length === 0) {
    errors.expected_output = 'Expected output jest wymagany'
  }
  if (!form.category) {
    errors.category = 'Kategoria jest wymagana'
  }
  if (!form.target_model) {
    errors.target_model = 'Model jest wymagany'
  }
  return errors
}

export default function TaskFormDrawer({
  open,
  task,
  onClose,
  onCreate,
  onUpdate,
}: TaskFormDrawerProps) {
  const isEdit = Boolean(task)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setForm({
        prompt: task.prompt,
        expected_output: task.expected_output,
        category: task.category,
        target_model: task.target_model,
        is_active: task.is_active,
      })
    } else {
      setForm(INITIAL_FORM)
    }
    setErrors({})
    setSubmitError(null)
  }, [task, open])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      if (isEdit && task) {
        await onUpdate(task.id, {
          prompt: form.prompt,
          expected_output: form.expected_output,
          category: form.category as EvalCategory,
          target_model: form.target_model as EvalModel,
          is_active: form.is_active,
        })
      } else {
        await onCreate({
          prompt: form.prompt,
          expected_output: form.expected_output,
          category: form.category as EvalCategory,
          target_model: form.target_model as EvalModel,
          is_active: form.is_active,
        })
      }
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const inputStyle = (hasError: boolean) => ({
    background: '#13111c',
    border: `1px solid ${hasError ? '#f87171' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '8px',
    color: '#e6edf3',
    fontSize: '13px',
    padding: '10px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  })

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8b8ba7',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edytuj golden task' : 'Dodaj golden task'}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '480px', maxWidth: '100vw',
          background: '#1a1728',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}>
            {isEdit ? '✏️ Edytuj Golden Task' : '➕ Dodaj Golden Task'}
          </h2>
          <button onClick={onClose} aria-label="Zamknij" style={{
            background: 'none', border: 'none', color: '#8b8ba7',
            fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px',
          }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate
          style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Prompt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="prompt" style={labelStyle}>
              Prompt <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="prompt" name="prompt" value={form.prompt}
              onChange={handleChange} rows={4}
              placeholder="Wpisz prompt (min. 10 znaków)..."
              style={{ ...inputStyle(Boolean(errors.prompt)), resize: 'vertical' }}
            />
            {errors.prompt && <span style={{ fontSize: '11px', color: '#f87171' }}>{errors.prompt}</span>}
          </div>

          {/* Expected Output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="expected_output" style={labelStyle}>
              Expected Output <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="expected_output" name="expected_output" value={form.expected_output}
              onChange={handleChange} rows={4}
              placeholder="Oczekiwany wynik..."
              style={{ ...inputStyle(Boolean(errors.expected_output)), resize: 'vertical' }}
            />
            {errors.expected_output && <span style={{ fontSize: '11px', color: '#f87171' }}>{errors.expected_output}</span>}
          </div>

          {/* Category + Model row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="category" style={labelStyle}>
                Kategoria <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                id="category" name="category" value={form.category}
                onChange={handleChange}
                style={{ ...inputStyle(Boolean(errors.category)), cursor: 'pointer' }}
              >
                <option value="">Wybierz...</option>
                {EVAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <span style={{ fontSize: '11px', color: '#f87171' }}>{errors.category}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="target_model" style={labelStyle}>
                Model <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                id="target_model" name="target_model" value={form.target_model}
                onChange={handleChange}
                style={{ ...inputStyle(Boolean(errors.target_model)), cursor: 'pointer' }}
              >
                <option value="">Wybierz...</option>
                {EVAL_MODELS.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              {errors.target_model && <span style={{ fontSize: '11px', color: '#f87171' }}>{errors.target_model}</span>}
            </div>
          </div>

          {/* Is Active */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox" id="is_active" name="is_active"
              checked={form.is_active} onChange={handleChange}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#34d399' }}
            />
            <label htmlFor="is_active" style={{ fontSize: '13px', color: '#e6edf3', cursor: 'pointer' }}>
              Aktywna (uwzględniana w eval run)
            </label>
          </div>

          {submitError && (
            <div style={{
              background: '#3a1a1a', border: '1px solid #5a2a2a',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '12px', color: '#f87171',
            }}>
              ⚠️ {submitError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '8px' }}>
            <button type="button" onClick={onClose} disabled={submitting} style={{
              flex: 1, background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
              color: '#8b8ba7', fontSize: '13px', fontWeight: 600,
              padding: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
              Anuluj
            </button>
            <button type="submit" disabled={submitting} style={{
              flex: 2,
              background: submitting ? '#2a2540' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: 'none', borderRadius: '8px',
              color: submitting ? '#6b7280' : '#fff',
              fontSize: '13px', fontWeight: 600,
              padding: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj task'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
