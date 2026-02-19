'use client'

// components/pipeline/PipelineEmptyState.tsx
// Komponent wyświetlany gdy żadna story nie spełnia aktywnych filtrów.
// Implementuje STORY-2.7 — AC-8.

interface PipelineEmptyStateProps {
  onReset: () => void
}

/**
 * Empty state dla Pipeline tab — wyświetlany gdy 0 wyników po filtrach.
 *
 * AC-8:
 * - Ikonka 🔍
 * - Tekst "Brak stories spełniających kryteria"
 * - Tekst pomocniczy "Zmień filtry lub wyszukaj inną frazę"
 * - Przycisk "Resetuj filtry" — czyści filtry i URL
 */
export function PipelineEmptyState({ onReset }: PipelineEmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: '#13111c',
        borderRadius: '8px',
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
      <div
        style={{
          fontSize: '14px',
          color: '#6b7280',
          fontWeight: 600,
        }}
      >
        Brak stories spełniających kryteria
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#4b4569',
          marginTop: '4px',
          marginBottom: '16px',
        }}
      >
        Zmień filtry lub wyszukaj inną frazę
      </div>
      <button
        onClick={onReset}
        style={{
          background: '#2a2540',
          border: 'none',
          borderRadius: '8px',
          padding: '7px 16px',
          color: '#e6edf3',
          fontSize: '12px',
          cursor: 'pointer',
        }}
        aria-label="Resetuj wszystkie filtry"
      >
        Resetuj filtry
      </button>
    </div>
  )
}
