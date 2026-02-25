'use client'

/**
 * app/(dashboard)/dashboard/eval/page.tsx
 * STORY-7.6 — Dedicated Eval / Regression Testing page.
 *
 * Route: /dashboard/eval
 *
 * Role-based access:
 * - ADMIN: full CRUD controls in GoldenTasksManager
 * - HELPER / HELPER_PLUS: read-only view
 * - Unauthenticated: handled by proxy.ts middleware (redirect to /login)
 */

import { Suspense, useState } from 'react'
import { useEval } from '@/hooks/useEval'
import { useRuns } from '@/hooks/useRuns'
import EvalFrameworkPanel from '@/components/eval/EvalFrameworkPanel'
import dynamic from 'next/dynamic'

const GoldenTasksManager = dynamic(
  () => import('@/components/eval/GoldenTasksManager'),
  {
    loading: () => (
      <div style={{
        background: '#1a1728',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '32px',
        textAlign: 'center',
        color: '#8b8ba7',
        fontSize: '13px',
      }}>
        Ładowanie Golden Tasks...
      </div>
    ),
    ssr: false,
  }
)

// ─── Info Popover ────────────────────────────────────────────────────────────

function InfoPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 10 }}
        aria-hidden="true"
      />
      <div
        role="tooltip"
        style={{
          position: 'absolute',
          top: '100%', right: 0, marginTop: '8px',
          background: '#1a1728',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '16px 18px',
          width: '320px',
          zIndex: 20,
          fontSize: '13px', color: '#e6edf3',
          lineHeight: 1.6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700 }}>
          Eval / Regression Testing
        </h4>
        <p style={{ margin: '0 0 10px', color: '#8b8ba7', fontSize: '12px' }}>
          Moduł ewaluacji pipeline. Testuje modele AI na zestawie golden tasks —
          predefinowanych przypadków z oczekiwanym wynikiem.
        </p>
        <ul style={{ margin: 0, paddingLeft: '16px', color: '#8b8ba7', fontSize: '12px' }}>
          <li style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#e6edf3' }}>Eval Framework</strong> — historia runów, pass rate per kategoria
          </li>
          <li style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#e6edf3' }}>Golden Tasks</strong> — zestaw testów referencyjnych
          </li>
          <li>
            <strong style={{ color: '#e6edf3' }}>ADMIN</strong> może dodawać, edytować i usuwać golden tasks
          </li>
        </ul>
      </div>
    </>
  )
}

// ─── Main page content ───────────────────────────────────────────────────────

function EvalPageContent() {
  const [infoOpen, setInfoOpen] = useState(false)

  const {
    scores,
    overallScore,
    recentRuns,
    loading: evalLoading,
    offline: evalOffline,
  } = useEval()

  useRuns()

  return (
    <div style={{ background: '#13111c', minHeight: '100%' }}>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px',
        position: 'relative',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e6edf3' }}>
            Eval / Regression Testing
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8b8ba7' }}>
            Pipeline quality monitoring &amp; golden task management
          </p>
        </div>

        {/* Info button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="Informacje o module Eval"
            aria-expanded={infoOpen}
            style={{
              background: infoOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              width: '32px', height: '32px',
              color: '#8b8ba7', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            ❓
          </button>
          <InfoPopover open={infoOpen} onClose={() => setInfoOpen(false)} />
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <EvalFrameworkPanel
          scores={scores}
          overallScore={overallScore}
          recentRuns={recentRuns}
          isLoading={evalLoading}
          isOffline={evalOffline}
        />
        <GoldenTasksManager />
      </div>
    </div>
  )
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function EvalPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '20px', color: '#4b4569', fontSize: '13px' }}>
        Ładowanie Eval...
      </div>
    }>
      <EvalPageContent />
    </Suspense>
  )
}
