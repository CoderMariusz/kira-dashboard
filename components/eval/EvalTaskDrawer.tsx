'use client'

/**
 * components/eval/EvalTaskDrawer.tsx
 * STORY-7.6 — Slide-in drawer for add/edit golden tasks.
 * Uses React Hook Form + Zod validation.
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { EVAL_CATEGORIES, EVAL_MODELS } from '@/lib/eval/types'
import type { EvalTask, EvalCategory, EvalModel } from '@/lib/eval/types'
import { createEvalTask, updateEvalTask } from '@/lib/eval/services'

// ─── Schema ──────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt musi miec co najmniej 10 znakow')
    .max(2000, 'Prompt moze miec co najwyzej 2000 znakow'),
  expected_output: z
    .string()
    .min(1, 'Expected output jest wymagany')
    .max(5000, 'Expected output moze miec co najwyzej 5000 znakow'),
  category: z.enum(EVAL_CATEGORIES, { message: 'Wybierz kategorie' }),
  target_model: z.enum(EVAL_MODELS, { message: 'Wybierz model' }),
  is_active: z.boolean(),
})

type TaskFormValues = z.infer<typeof taskSchema>

// ─── Props ───────────────────────────────────────────────────────────────────

interface EvalTaskDrawerProps {
  open: boolean
  task?: EvalTask | null
  onClose: () => void
  mutate: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EvalTaskDrawer({
  open,
  task,
  onClose,
  mutate,
}: EvalTaskDrawerProps) {
  const isEdit = Boolean(task)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      prompt: '',
      expected_output: '',
      category: EVAL_CATEGORIES[0],
      target_model: EVAL_MODELS[0],
      is_active: true,
    },
  })

  // Reset form when drawer opens or task changes
  useEffect(() => {
    if (open) {
      reset(
        task
          ? {
              prompt: task.prompt,
              expected_output: task.expected_output,
              category: task.category,
              target_model: task.target_model,
              is_active: task.is_active,
            }
          : {
              prompt: '',
              expected_output: '',
              category: EVAL_CATEGORIES[0],
              target_model: EVAL_MODELS[0],
              is_active: true,
            }
      )
    }
  }, [open, task, reset])

  const onSubmit = async (values: TaskFormValues) => {
    try {
      if (isEdit && task) {
        await updateEvalTask(task.id, {
          prompt: values.prompt,
          expected_output: values.expected_output,
          category: values.category as EvalCategory,
          target_model: values.target_model as EvalModel,
          is_active: values.is_active,
        })
        toast.success('Task zaktualizowany')
      } else {
        await createEvalTask({
          prompt: values.prompt,
          expected_output: values.expected_output,
          category: values.category as EvalCategory,
          target_model: values.target_model as EvalModel,
          is_active: values.is_active,
        })
        toast.success('Task dodany')
      }
      mutate()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nieznany blad'
      toast.error(`Blad: ${msg}`)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 40,
        }}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edytuj golden task' : 'Dodaj golden task'}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '100vw',
          background: '#1a1728',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}>
            {isEdit ? 'Edytuj Golden Task' : 'Dodaj Golden Task'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            style={{
              background: 'none',
              border: 'none',
              color: '#8b8ba7',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            x
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          noValidate
          style={{
            flex: 1,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Prompt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="ev-prompt"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#8b8ba7',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Prompt <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="ev-prompt"
              {...register('prompt')}
              rows={4}
              placeholder="Wpisz prompt (min. 10 znakow)..."
              style={{
                background: '#13111c',
                border: `1px solid ${errors.prompt ? '#f87171' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                color: '#e6edf3',
                fontSize: '13px',
                padding: '10px 12px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {errors.prompt && (
              <span style={{ fontSize: '11px', color: '#f87171' }}>
                {errors.prompt.message}
              </span>
            )}
          </div>

          {/* Expected Output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="ev-expected"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#8b8ba7',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Expected Output <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="ev-expected"
              {...register('expected_output')}
              rows={4}
              placeholder="Oczekiwany wynik..."
              style={{
                background: '#13111c',
                border: `1px solid ${errors.expected_output ? '#f87171' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                color: '#e6edf3',
                fontSize: '13px',
                padding: '10px 12px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {errors.expected_output && (
              <span style={{ fontSize: '11px', color: '#f87171' }}>
                {errors.expected_output.message}
              </span>
            )}
          </div>

          {/* Category + Model row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="ev-category"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8b8ba7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Kategoria <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                id="ev-category"
                {...register('category')}
                style={{
                  background: '#13111c',
                  border: `1px solid ${errors.category ? '#f87171' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '8px',
                  color: '#e6edf3',
                  fontSize: '13px',
                  padding: '10px 12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {EVAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && (
                <span style={{ fontSize: '11px', color: '#f87171' }}>
                  {errors.category.message}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="ev-model"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8b8ba7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Model <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                id="ev-model"
                {...register('target_model')}
                style={{
                  background: '#13111c',
                  border: `1px solid ${errors.target_model ? '#f87171' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '8px',
                  color: '#e6edf3',
                  fontSize: '13px',
                  padding: '10px 12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {EVAL_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {errors.target_model && (
                <span style={{ fontSize: '11px', color: '#f87171' }}>
                  {errors.target_model.message}
                </span>
              )}
            </div>
          </div>

          {/* Is Active */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="ev-active"
              {...register('is_active')}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#34d399' }}
            />
            <label htmlFor="ev-active" style={{ fontSize: '13px', color: '#e6edf3', cursor: 'pointer' }}>
              Aktywna (uwzgledniana w eval run)
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#8b8ba7',
                fontSize: '13px',
                fontWeight: 600,
                padding: '10px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2,
                background: isSubmitting ? '#2a2540' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                border: 'none',
                borderRadius: '8px',
                color: isSubmitting ? '#6b7280' : '#fff',
                fontSize: '13px',
                fontWeight: 600,
                padding: '10px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj task'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
