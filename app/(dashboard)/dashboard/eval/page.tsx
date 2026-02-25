'use client'

/**
 * app/(dashboard)/dashboard/eval/page.tsx
 * STORY-7.6 -- Eval page with Golden Tasks section.
 *
 * Route: /dashboard/eval
 *
 * Sections:
 *   - EvalFrameworkPanel (UNCHANGED)
 *   - Golden Tasks: CategoryFilter + EvalTasksTable + EvalTaskDrawer + DeleteTaskModal
 *
 * RBAC: ADMIN = full CRUD; HELPER/HELPER_PLUS = read-only
 */

import { Suspense, useState } from 'react'
import { useEval } from '@/hooks/useEval'
import { useRuns } from '@/hooks/useRuns'
import { useUserRole } from '@/hooks/useUserRole'
import EvalFrameworkPanel from '@/components/eval/EvalFrameworkPanel'
import CategoryFilter from '@/components/eval/CategoryFilter'
import EvalTasksTable from '@/components/eval/EvalTasksTable'
import EvalTaskDrawer from '@/components/eval/EvalTaskDrawer'
import DeleteTaskModal from '@/components/eval/DeleteTaskModal'
import { useEvalTasks } from '@/lib/eval/services'
import type { EvalTask } from '@/lib/eval/types'

// -- Info Popover -------------------------------------------------------------

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
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: '#1a1728',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '16px 18px',
          width: '320px',
          zIndex: 20,
          fontSize: '13px',
          color: '#e6edf3',
          lineHeight: 1.6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700 }}>
          Eval / Regression Testing
        </h4>
        <p style={{ margin: '0 0 10px', color: '#8b8ba7', fontSize: '12px' }}>
          Modul ewaluacji pipeline. Testuje modele AI na zestawie golden tasks.
        </p>
        <ul style={{ margin: 0, paddingLeft: '16px', color: '#8b8ba7', fontSize: '12px' }}>
          <li style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#e6edf3' }}>Eval Framework</strong> -- historia runow, pass rate per kategoria
          </li>
          <li style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#e6edf3' }}>Golden Tasks</strong> -- zestaw testow referencyjnych
          </li>
          <li>
            <strong style={{ color: '#e6edf3' }}>ADMIN</strong> moze dodawac, edytowac i usuwac golden tasks
          </li>
        </ul>
      </div>
    </>
  )
}

// -- Golden Tasks Section -----------------------------------------------------

function GoldenTasksSection() {
  const { isAdmin } = useUserRole()
  const [category, setCategory] = useState('ALL')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTask, setEditTask] = useState<EvalTask | null>(null)
  const [deleteTask, setDeleteTask] = useState<EvalTask | null>(null)

  const { mutate } = useEvalTasks()

  function openAdd() {
    setEditTask(null)
    setDrawerOpen(true)
  }

  function openEdit(task: EvalTask) {
    setEditTask(task)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTask(null)
  }

  return (
    <section>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e6edf3' }}>
          Golden Tasks
        </h2>
        {isAdmin && (
          <button
            onClick={openAdd}
            aria-label="Dodaj golden task"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            + Dodaj task
          </button>
        )}
      </div>

      <CategoryFilter selected={category} onChange={setCategory} />

      <EvalTasksTable
        category={category}
        onEdit={openEdit}
        onDelete={(task) => setDeleteTask(task)}
        onAdd={openAdd}
      />

      <EvalTaskDrawer
        open={drawerOpen}
        task={editTask}
        onClose={closeDrawer}
        mutate={mutate}
      />

      <DeleteTaskModal
        task={deleteTask}
        onCancel={() => setDeleteTask(null)}
        mutate={mutate}
      />
    </section>
  )
}

// -- Main page content --------------------------------------------------------

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
    <div style={{ background: '#13111c', minHeight: '100%', padding: '0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          position: 'relative',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e6edf3' }}>
            Eval / Regression Testing
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8b8ba7' }}>
            Pipeline quality monitoring & golden task management
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="Informacje o module Eval"
            aria-expanded={infoOpen}
            style={{
              background: infoOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#8b8ba7',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            ?
          </button>
          <InfoPopover open={infoOpen} onClose={() => setInfoOpen(false)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* EvalFrameworkPanel -- UNCHANGED */}
        <EvalFrameworkPanel
          scores={scores}
          overallScore={overallScore}
          recentRuns={recentRuns}
          isLoading={evalLoading}
          isOffline={evalOffline}
        />

        {/* Golden Tasks section */}
        <GoldenTasksSection />
      </div>
    </div>
  )
}

// -- Page export --------------------------------------------------------------

export default function EvalPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '20px', color: '#4b4569', fontSize: '13px' }}>
          Ladowanie Eval...
        </div>
      }
    >
      <EvalPageContent />
    </Suspense>
  )
}
