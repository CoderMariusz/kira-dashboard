'use client'

// components/pipeline/NewProjectWizard.tsx
// 3-krokowy wizard modal "Nowy projekt": PRD input → Pytania AI → Podgląd + Rejestracja
// Implemented in STORY-6.6

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { prdService } from '@/services/prdService'
import { useProjectStats } from '@/hooks/useProjectStats'
import type { PrdQuestion, GeneratedEpic, CreateFromPrdResponse } from '@/types/pipeline-prd'

// ─── State machine ────────────────────────────────────────────────────────────

type WizardStep =
  | 'prd-input'
  | 'analyzing'
  | 'questions'
  | 'generating'
  | 'preview'
  | 'registering'
  | 'error'

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewProjectWizardProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRD_MIN_LENGTH = 50
const PRD_MAX_LENGTH = 20_000
const PRD_WARN_AT = 18_000
const PROJECT_KEY_REGEX = /^[a-z0-9-]+$/

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Auto-generuje project_key z project_name: lowercase, spacje → myślniki, usuń znaki specjalne */
function generateKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Waliduje project_key — zwraca komunikat błędu lub '' gdy OK */
function validateProjectKey(key: string): string {
  if (key.length < 3) return 'Klucz projektu musi mieć min 3 znaki'
  if (key.length > 40) return 'Klucz projektu może mieć max 40 znaków'
  if (!PROJECT_KEY_REGEX.test(key)) return 'Tylko małe litery, cyfry i myślniki'
  return ''
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <svg
        className="animate-spin"
        width={40}
        height={40}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-20"
          cx={12}
          cy={12}
          r={10}
          stroke="#818cf8"
          strokeWidth={3}
        />
        <path
          className="opacity-80"
          fill="#818cf8"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

// ─── QuestionField ────────────────────────────────────────────────────────────

interface QuestionFieldProps {
  question: PrdQuestion
  index: number
  value: string
  onChange: (value: string) => void
}

function QuestionField({ question, index, value, onChange }: QuestionFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`q-${question.id}`}
        className="text-sm font-medium text-slate-200"
      >
        <span className="text-[#818cf8] font-semibold mr-1">{index + 1}.</span>
        {question.text}
        {question.required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
      </label>

      {question.type === 'choice' && question.options ? (
        <div className="flex flex-col gap-2 pl-1">
          {question.options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="accent-[#818cf8] w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                {option}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <input
          id={`q-${question.id}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Twoja odpowiedź..."
          className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500
            bg-[#0d0c1a] border border-[#2a2540]
            focus:outline-none focus:border-[#818cf8] focus:ring-1 focus:ring-[#818cf8]
            transition-colors"
        />
      )}
    </div>
  )
}

// ─── EpicPreviewItem ──────────────────────────────────────────────────────────

function EpicPreviewItem({ epic }: { epic: GeneratedEpic }) {
  return (
    <div className="rounded-lg border border-[#2a2540] bg-[#0d0c1a] px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono text-[#818cf8] shrink-0">{epic.epic_id}</span>
        <span className="text-sm text-slate-200 truncate">{epic.title}</span>
      </div>
      <span className="text-xs text-slate-500 shrink-0 tabular-nums">
        {epic.stories_count} {epic.stories_count === 1 ? 'story' : 'stories'}
      </span>
    </div>
  )
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

const STEP_TO_INDEX: Partial<Record<WizardStep, number>> = {
  'prd-input': 0,
  'analyzing': 0,
  'questions': 1,
  'generating': 1,
  'preview': 2,
  'registering': 2,
}

function ProgressDots({ currentStep }: { currentStep: WizardStep }) {
  const active = STEP_TO_INDEX[currentStep] ?? 0

  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block rounded-full transition-all duration-300"
          style={{
            background: i === active ? '#818cf8' : '#2a2540',
            width: i === active ? 24 : 8,
            height: 8,
          }}
        />
      ))}
    </div>
  )
}

// ─── WizardDialog (inner — all stateful logic) ────────────────────────────────
// Mounted fresh on each open (parent renders null when isOpen=false),
// so no need for a reset effect. State is automatically fresh on each open.

interface WizardDialogProps {
  onClose: () => void
}

function WizardDialog({ onClose }: WizardDialogProps) {
  const [step, setStep] = useState<WizardStep>('prd-input')
  const [prdText, setPrdText] = useState('')
  const [questions, setQuestions] = useState<PrdQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [generatedData, setGeneratedData] = useState<CreateFromPrdResponse | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectKey, setProjectKey] = useState('')
  const [projectKeyError, setProjectKeyError] = useState('')
  const [inlineError, setInlineError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [projectNameTouched, setProjectNameTouched] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const { mutate } = useProjectStats()

  // ── Escape + focus trap ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        )
        const list = Array.from(focusable)
        if (list.length === 0) return

        const first = list[0]
        const last = list[list.length - 1]
        if (!first || !last) return

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // ── Step 1 → Step 2: analyze PRD ──
  const handleAnalyze = useCallback(async () => {
    setStep('analyzing')
    try {
      const data = await prdService.getQuestions(prdText)

      if (data.questions.length === 0) {
        // EC-2: Brak pytań — przeskocz od razu do generowania
        toast.info('Kira nie potrzebuje dodatkowych pytań — przejdź do generowania')
        setStep('generating')
        const generated = await prdService.createFromPrd({
          prd_text: prdText,
          project_name: 'Podgląd projektu',
          project_key: `preview-${Date.now()}`,
          answers: {},
        })
        setGeneratedData(generated)
        setStep('preview')
        return
      }

      setQuestions(data.questions)
      setStep('questions')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nieznany błąd')
      setStep('error')
    }
  }, [prdText])

  // ── Step 2 → Step 3: generate preview ──
  const handleGenerate = useCallback(async () => {
    setStep('generating')
    try {
      // Pierwsze wywołanie — generowanie podglądu struktury epików
      // project_name i project_key są tymczasowe (użytkownik poda je w kroku 3)
      const data = await prdService.createFromPrd({
        prd_text: prdText,
        project_name: 'Podgląd projektu',
        project_key: `preview-${Date.now()}`,
        answers,
      })
      setGeneratedData(data)
      setStep('preview')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nieznany błąd')
      setStep('error')
    }
  }, [prdText, answers])

  // ── Step 3: register project ──
  const handleRegister = useCallback(async () => {
    const keyErr = validateProjectKey(projectKey)
    if (keyErr) {
      setProjectKeyError(keyErr)
      return
    }
    if (projectName.trim().length < 2) return

    setInlineError('')
    setStep('registering')
    try {
      // Drugie wywołanie — rejestracja z prawdziwymi danymi projektu
      const data = await prdService.createFromPrd({
        prd_text: prdText,
        project_name: projectName.trim(),
        project_key: projectKey,
        answers,
      })
      toast.success(`Projekt ${data.project_key} zarejestrowany ✓`)
      await mutate()
      onClose()
    } catch (err) {
      const error = err as Error & { status?: number }
      if (error.status === 409) {
        // AC-5: Projekt już istnieje — wróć do podglądu z inline error
        setInlineError('Projekt o tym kluczu już istnieje w Bridge — zmień klucz')
        setStep('preview')
      } else {
        setErrorMessage(error.message ?? 'Nieznany błąd')
        setStep('error')
      }
    }
  }, [prdText, projectName, projectKey, answers, mutate, onClose])

  // ── EC-3: auto-generate project_key from project_name ──
  const handleProjectNameChange = useCallback((name: string) => {
    setProjectName(name)
    setProjectNameTouched(true)
    const autoKey = generateKey(name)
    setProjectKey(autoKey)
    setProjectKeyError(autoKey.length >= 3 ? validateProjectKey(autoKey) : '')
  }, [])

  const handleProjectKeyChange = useCallback((key: string) => {
    setProjectKey(key)
    setProjectKeyError(validateProjectKey(key))
  }, [])

  // ── Derived ──
  const charCount = prdText.length
  const charCountWarning = charCount >= PRD_WARN_AT
  const canAnalyze = prdText.trim().length >= PRD_MIN_LENGTH
  const isLoading = step === 'analyzing' || step === 'generating' || step === 'registering'
  const canRegister =
    projectName.trim().length >= 2 &&
    projectKey.length >= 3 &&
    validateProjectKey(projectKey) === ''
  const allRequiredAnswered = questions.every(
    (q) => !q.required || (answers[q.id] ?? '').trim().length > 0
  )

  // ── Render ──
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wizard-title"
          className="pointer-events-auto flex flex-col"
          style={{
            background: '#1a1730',
            border: '1px solid #3b3d7a',
            borderRadius: 16,
            width: 'min(560px, calc(100vw - 32px))',
            maxHeight: 'min(80vh, 90vh)',
            padding: 24,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="flex items-center justify-center shrink-0 rounded-lg text-white"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                width: 32,
                height: 32,
              }}
              aria-hidden="true"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>

            <h2 id="wizard-title" className="flex-1 text-lg font-semibold text-white">
              Nowy projekt
            </h2>

            <ProgressDots currentStep={step} />

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors rounded-lg p-1.5 -mr-1.5"
              aria-label="Zamknij modal"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* Step 1: PRD input */}
            {step === 'prd-input' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-400">
                  Wklej opis swojego projektu. Kira przeanalizuje PRD i wygeneruje strukturę epików i stories.
                </p>
                <textarea
                  value={prdText}
                  onChange={(e) => setPrdText(e.target.value)}
                  maxLength={PRD_MAX_LENGTH}
                  placeholder="Opisz co ma robić Twój projekt..."
                  className="w-full resize-none rounded-lg px-3 py-3 text-sm text-white placeholder-slate-500
                    focus:outline-none focus:border-[#818cf8] focus:ring-1 focus:ring-[#818cf8]
                    transition-colors"
                  style={{
                    background: '#0d0c1a',
                    border: '1px solid #2a2540',
                    minHeight: 160,
                  }}
                  aria-label="Treść PRD"
                  aria-describedby="char-count"
                />
                <p
                  id="char-count"
                  className="text-xs text-right"
                  style={{ color: charCountWarning ? '#fb923c' : '#64748b' }}
                >
                  {charCount.toLocaleString()}/{PRD_MAX_LENGTH.toLocaleString()}
                </p>
              </div>
            )}

            {/* Loading: analyzing */}
            {step === 'analyzing' && <Spinner label="Kira analizuje PRD..." />}

            {/* Step 2: Questions */}
            {step === 'questions' && (
              <div className="flex flex-col gap-5">
                <p className="text-sm text-slate-400">
                  Odpowiedz na pytania, aby Kira mogła lepiej zaplanować projekt.
                </p>
                {questions.map((q, i) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    index={i}
                    value={answers[q.id] ?? ''}
                    onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                  />
                ))}
              </div>
            )}

            {/* Loading: generating */}
            {step === 'generating' && <Spinner label="Generuję strukturę projektu..." />}

            {/* Step 3: Preview + Registration */}
            {step === 'preview' && generatedData && (
              <div className="flex flex-col gap-5">
                {/* AC-5: Inline error banner (409 conflict) */}
                {inlineError && (
                  <div
                    className="rounded-lg px-4 py-3 text-sm text-red-300 border border-red-500/30"
                    style={{ background: 'rgba(239,68,68,0.08)' }}
                    role="alert"
                  >
                    {inlineError}
                  </div>
                )}

                {/* Epic preview */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-300">Wygenerowane epiki</p>
                    <span className="text-xs text-slate-500">
                      {generatedData.epics_count} epików · {generatedData.stories_count} stories
                    </span>
                  </div>
                  {/* EC-4: scrollable when list is long */}
                  <div
                    className="flex flex-col gap-2 overflow-y-auto pr-0.5"
                    style={{ maxHeight: '40vh' }}
                  >
                    {generatedData.epics.map((epic) => (
                      <EpicPreviewItem key={epic.epic_id} epic={epic} />
                    ))}
                  </div>
                </div>

                {/* Project name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="project-name" className="text-sm font-medium text-slate-300">
                    Nazwa projektu <span className="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => handleProjectNameChange(e.target.value)}
                    onBlur={() => setProjectNameTouched(true)}
                    placeholder="np. Gym Tracker"
                    maxLength={100}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500
                      bg-[#0d0c1a] border border-[#2a2540]
                      focus:outline-none focus:border-[#818cf8] focus:ring-1 focus:ring-[#818cf8]
                      transition-colors"
                  />
                  {projectNameTouched && projectName.trim().length > 0 && projectName.trim().length < 2 && (
                    <p className="text-xs text-red-400">Nazwa projektu musi mieć min 2 znaki</p>
                  )}
                </div>

                {/* Project key */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="project-key" className="text-sm font-medium text-slate-300">
                    Klucz projektu <span className="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="project-key"
                    type="text"
                    value={projectKey}
                    onChange={(e) => handleProjectKeyChange(e.target.value)}
                    placeholder="np. gym-tracker"
                    maxLength={40}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500
                      bg-[#0d0c1a] transition-colors
                      focus:outline-none font-mono"
                    style={{
                      border: projectKeyError ? '1px solid #f87171' : '1px solid #2a2540',
                    }}
                  />
                  {projectKeyError ? (
                    <p className="text-xs text-red-400">{projectKeyError}</p>
                  ) : (
                    projectKey.length > 0 && (
                      <p className="text-xs text-slate-500 font-mono">
                        Tylko małe litery, cyfry i myślniki (a-z, 0-9, -)
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Loading: registering */}
            {step === 'registering' && <Spinner label="Rejestruję projekt w Bridge..." />}

            {/* Error state */}
            {step === 'error' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(239,68,68,0.12)', width: 48, height: 48 }}
                  aria-hidden="true"
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2}>
                    <circle cx={12} cy={12} r={10} />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-red-300 mb-1">Wystąpił błąd</p>
                  <p className="text-sm text-slate-400">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('')
                    setStep('prd-input')
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  Spróbuj ponownie
                </button>
              </div>
            )}
          </div>

          {/* ── Footer CTA ── */}
          {!isLoading && step !== 'error' && (
            <div className="mt-5 flex justify-end">
              {step === 'prd-input' && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                    opacity: canAnalyze ? 1 : 0.4,
                    cursor: canAnalyze ? 'pointer' : 'not-allowed',
                  }}
                >
                  Analizuj PRD →
                </button>
              )}

              {step === 'questions' && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!allRequiredAnswered}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                    opacity: allRequiredAnswered ? 1 : 0.4,
                    cursor: allRequiredAnswered ? 'pointer' : 'not-allowed',
                  }}
                >
                  Generuj projekt →
                </button>
              )}

              {step === 'preview' && (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={!canRegister}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                    opacity: canRegister ? 1 : 0.4,
                    cursor: canRegister ? 'pointer' : 'not-allowed',
                  }}
                >
                  Zarejestruj w Bridge ✓
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────
// WizardDialog is mounted fresh on each open, guaranteeing clean state.
// Rendering null when isOpen=false achieves the unmount/remount pattern.

export default function NewProjectWizard({ isOpen, onClose }: NewProjectWizardProps) {
  if (!isOpen) return null
  return <WizardDialog onClose={onClose} />
}
