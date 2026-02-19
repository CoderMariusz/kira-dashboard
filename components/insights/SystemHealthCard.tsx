'use client'

// components/insights/SystemHealthCard.tsx
// Karta System Health z statusem Bridge API, memU, DB i alertami.
// Auto-refresh co 60 sekund (zarządzany przez useHealth).
// Obsługuje częściowe awarie (EC-1) i offline state.

import { useHealth } from '@/hooks/useHealth'
import type { Alert, AlertType } from '@/types/insights'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLastRun(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function formatDbSize(mb: number): string {
  return `${mb.toFixed(1)} MB`
}

function alertDotColor(type: AlertType): string {
  switch (type) {
    case 'CRITICAL':
      return '#f85149'
    case 'WARNING':
      return '#e3b341'
    case 'INFO':
      return '#60a5fa'
    case 'OK':
      return '#4ade80'
    default:
      return '#4ade80'
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 9px',
        background: '#13111c',
        borderRadius: 6,
        marginBottom: 5,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: alertDotColor(alert.type),
          flexShrink: 0,
        }}
        aria-hidden
      />
      <span style={{ fontSize: 12, color: '#e6edf3', flex: 1 }}>{alert.message}</span>
      <span style={{ fontSize: 10, color: '#4b4569', flexShrink: 0 }}>
        {truncate(alert.detail, 30)}
      </span>
    </div>
  )
}

// ─── Health cell ─────────────────────────────────────────────────────────────

interface HealthCellProps {
  label: string
  children: React.ReactNode
}

function HealthCell({ label, children }: HealthCellProps) {
  return (
    <div style={{ background: '#13111c', borderRadius: 7, padding: '9px 11px' }}>
      <div style={{ fontSize: 10, color: '#4b4569', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HealthSkeleton() {
  return (
    <div
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: 10,
        padding: 15,
      }}
    >
      <div
        style={{ height: 13, width: '45%', background: '#2a2540', borderRadius: 4, marginBottom: 12 }}
        className="animate-pulse"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 7,
          marginBottom: 12,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ height: 52, background: '#2a2540', borderRadius: 7 }}
            className="animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Karta System Health.
 * Pokazuje status Bridge API, memU, DB size i alerty.
 * Auto-refresh co 60s (via useHealth).
 */
export function SystemHealthCard() {
  const { data, loading, offline } = useHealth()

  if (loading) return <HealthSkeleton />

  const cardStyle: React.CSSProperties = {
    background: '#1a1730',
    border: '1px solid #2a2540',
    borderRadius: 10,
    padding: 15,
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>System Health</span>
    </div>
  )

  // Offline — dane niedostępne
  if (!data) {
    return (
      <div style={cardStyle} role="region" aria-label="System Health — odświeżany co 60 sekund">
        {header}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 7,
            marginBottom: 12,
          }}
        >
          <HealthCell label="Bridge API">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f87171' }}>● Offline</div>
          </HealthCell>
          <HealthCell label="memU">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>—</div>
          </HealthCell>
          <HealthCell label="DB Size">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>—</div>
          </HealthCell>
          <HealthCell label="Last Run">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>—</div>
          </HealthCell>
        </div>
      </div>
    )
  }

  // Zbuduj alerty — jeśli pusta tablica, pokaż OK
  const alerts = data.alerts.length > 0
    ? data.alerts
    : [{ type: 'OK' as AlertType, message: 'System działa poprawnie', detail: '' }]

  return (
    <div style={cardStyle} role="region" aria-label="System Health — odświeżany co 60 sekund">
      {header}

      {/* Health grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 7,
          marginBottom: 12,
        }}
      >
        {/* Bridge API */}
        <HealthCell label="Bridge API">
          {offline ? (
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>—</div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: data.bridge.status === 'UP' ? '#4ade80' : '#f87171',
                }}
              >
                ● {data.bridge.status === 'UP' ? 'Online' : 'Offline'}
              </div>
              {data.bridge.status === 'UP' && data.bridge.ping_ms !== undefined && (
                <div style={{ fontSize: 9, color: '#4b4569', marginTop: 2 }}>
                  ping: {data.bridge.ping_ms}ms
                </div>
              )}
            </>
          )}
        </HealthCell>

        {/* memU */}
        <HealthCell label="memU">
          {offline ? (
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>—</div>
          ) : (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: data.memu.status === 'UP' ? '#4ade80' : '#f87171',
              }}
            >
              ● {data.memu.status === 'UP' ? 'Online' : 'Offline'}
            </div>
          )}
        </HealthCell>

        {/* DB Size */}
        <HealthCell label="DB Size">
          <div style={{ fontSize: 12, fontWeight: 600, color: offline ? '#6b7280' : '#e6edf3' }}>
            {offline ? '—' : formatDbSize(data.db_size_mb)}
          </div>
        </HealthCell>

        {/* Last Run */}
        <HealthCell label="Last Run">
          <div style={{ fontSize: 12, fontWeight: 600, color: offline ? '#6b7280' : '#e6edf3' }}>
            {offline ? '—' : formatLastRun(data.last_run)}
          </div>
        </HealthCell>
      </div>

      {/* Alerty */}
      <div aria-live="polite">
        {offline ? (
          <AlertRow alert={{ type: 'CRITICAL', message: 'Bridge offline', detail: '' }} />
        ) : (
          alerts.map((alert, idx) => (
            <AlertRow key={idx} alert={alert} />
          ))
        )}
      </div>
    </div>
  )
}
