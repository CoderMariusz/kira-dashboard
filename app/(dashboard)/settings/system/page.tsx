'use client'
// app/(dashboard)/settings/system/page.tsx
// STORY-10.8 — Widok /settings/system — health panel, API keys, cron jobs, restart Bridge

import { useState } from 'react'
import { useSystemStatus } from '@/hooks/useSystemStatus'
import { useApiKeys } from '@/hooks/useApiKeys'
import { useCronJobs } from '@/hooks/useCronJobs'
import { SystemService } from '@/services/system.service'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    error:   'bg-red-500/20 text-red-400 border-red-500/40',
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse',
    never:   'bg-slate-500/20 text-slate-400 border-slate-500/40',
  }
  const labels: Record<string, string> = {
    success: '✅ OK',
    error:   '❌ Błąd',
    running: '⟳ Działa',
    never:   '— Nigdy',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${styles[status] ?? styles.never}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function SystemSettingsPage() {
  // useSystemStatus returns { data, isLoading, error, refresh }
  const { data: statusData, isLoading: statusLoading, error: statusError } = useSystemStatus()
  // useApiKeys returns { keys, isLoading, error, refresh }
  const { keys: keysData, isLoading: keysLoading } = useApiKeys()
  // useCronJobs returns { jobs, isLoading, error, refresh }
  const { jobs: cronData, isLoading: cronLoading } = useCronJobs()

  const [restarting, setRestarting] = useState(false)
  const [showRestartModal, setShowRestartModal] = useState(false)
  const pathname = usePathname()

  const handleRestart = async () => {
    setRestarting(true)
    setShowRestartModal(false)
    try {
      await SystemService.restartBridge()
      alert('Bridge restart zainicjowany — usługa wróci za chwilę')
    } catch {
      alert('Błąd: Bridge jest niedostępny')
    } finally {
      setRestarting(false)
    }
  }

  const bridgeDown = statusData?.bridge?.status === 'DOWN'

  return (
    <div className="min-h-screen bg-[#0d0c1a] text-[#e6edf3] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e6edf3]">⚙️ Ustawienia</h1>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 mb-8 border-b border-[#3b3d7a]">
        <Link
          href="/settings/users"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            pathname === '/settings/users'
              ? 'border-[#818cf8] text-[#818cf8]'
              : 'border-transparent text-[#4b4569] hover:text-[#e6edf3]'
          }`}
        >
          Użytkownicy
        </Link>
        <Link
          href="/settings/system"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            pathname === '/settings/system'
              ? 'border-[#818cf8] text-[#818cf8]'
              : 'border-transparent text-[#4b4569] hover:text-[#e6edf3]'
          }`}
        >
          System
        </Link>
      </div>

      <div className="space-y-8 max-w-4xl">

        {/* ── Section 1: Status Cards ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-[#e6edf3]">Status usług</h2>
          {statusLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map(i => (
                <div key={i} className="animate-pulse h-32 bg-[#1a1730] rounded-lg" />
              ))}
            </div>
          ) : statusError ? (
            <div className="text-red-400 p-4 bg-[#1a1730] rounded-lg border border-red-500/20">
              Nie można pobrać statusu
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* OpenClaw card */}
              <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚙️</span>
                  <h3 className="font-medium">OpenClaw</h3>
                  <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded">
                    UP
                  </span>
                </div>
                <div className="space-y-1 text-sm text-[#4b4569]">
                  <div>
                    Wersja:{' '}
                    <span className="text-[#e6edf3]">{statusData?.openclaw?.version ?? '—'}</span>
                  </div>
                  <div>
                    Uptime:{' '}
                    <span className="text-[#e6edf3]">
                      {statusData?.openclaw?.uptime != null
                        ? formatUptime(statusData.openclaw.uptime)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span>WhatsApp: {statusData?.openclaw?.channels?.whatsapp ? '✅' : '❌'}</span>
                    <span>Telegram: {statusData?.openclaw?.channels?.telegram ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>

              {/* Bridge card */}
              <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔗</span>
                  <h3 className="font-medium">Bridge</h3>
                  <span
                    className={`ml-auto text-xs px-2 py-0.5 rounded border ${
                      statusData?.bridge?.status === 'UP'
                        ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40'
                        : 'text-red-400 bg-red-500/20 border-red-500/40'
                    }`}
                  >
                    {statusData?.bridge?.status ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-[#4b4569]">
                  <div>
                    Wersja:{' '}
                    <span className="text-[#e6edf3]">{statusData?.bridge?.version ?? '—'}</span>
                  </div>
                  <div>
                    Ostatni błąd:{' '}
                    <span className={statusData?.bridge?.lastError ? 'text-red-400' : 'text-emerald-400'}>
                      {statusData?.bridge?.lastError?.message ?? 'brak ✓'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </section>

        {/* ── Section 2: API Keys ── */}
        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#e6edf3]">Klucze API</h2>
          <div className="text-xs text-[#4b4569] mb-3">
            🔒 Pełne wartości kluczy nie są wyświetlane ze względów bezpieczeństwa.
          </div>
          {keysLoading ? (
            <div className="animate-pulse h-32 bg-[#1a1730] rounded-lg" />
          ) : (
            <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#3b3d7a]">
                    <tr className="text-[#4b4569]">
                      <th className="text-left p-3">Klucz</th>
                      <th className="text-left p-3">Wartość</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Wygasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(keysData ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-[#4b4569]">
                          Brak kluczy API
                        </td>
                      </tr>
                    ) : (
                      (keysData ?? []).map((key, i) => (
                        <tr key={i} className="border-b border-[#3b3d7a]/50 last:border-0">
                          <td className="p-3">{key.name}</td>
                          <td className="p-3 font-mono text-xs">{key.maskedValue}</td>
                          <td className="p-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded border ${
                                key.status === 'active'
                                  ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40'
                                  : 'text-slate-400 bg-slate-500/20 border-slate-500/40'
                              }`}
                            >
                              {key.status === 'active' ? '✅ OK' : key.status}
                            </span>
                          </td>
                          <td className="p-3 text-[#4b4569]">{key.expiresAt ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 3: Cron Jobs ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-[#e6edf3]">Zadania cron</h2>
          {cronLoading ? (
            <div className="animate-pulse h-32 bg-[#1a1730] rounded-lg" />
          ) : (
            <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#3b3d7a]">
                    <tr className="text-[#4b4569]">
                      <th className="text-left p-3">Nazwa</th>
                      <th className="text-left p-3">Harmonogram</th>
                      <th className="text-left p-3">Ostatni run</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cronData ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-[#4b4569]">
                          Brak zarejestrowanych cron jobów
                        </td>
                      </tr>
                    ) : (
                      (cronData ?? []).map((job, i) => (
                        <tr key={i} className="border-b border-[#3b3d7a]/50 last:border-0">
                          <td className="p-3 font-mono text-xs">{job.name}</td>
                          <td className="p-3 font-mono text-xs text-[#4b4569]">{job.schedule}</td>
                          <td className="p-3 text-[#4b4569] text-xs">
                            {job.lastRun ? new Date(job.lastRun).toLocaleString('pl-PL') : '—'}
                          </td>
                          <td className="p-3">
                            <RunStatusBadge status={job.lastStatus} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 4: System Actions ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-[#e6edf3]">Akcje systemowe</h2>
          <div className="bg-[#1a1730] border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[#e6edf3]">Restart Bridge</h3>
                <p className="text-sm text-[#4b4569] mt-1">
                  Spowoduje chwilową niedostępność pipeline. Używaj tylko w razie problemów.
                </p>
              </div>
              <button
                onClick={() => setShowRestartModal(true)}
                disabled={restarting || bridgeDown}
                className="px-4 py-2 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {restarting ? '⟳ Restartuję...' : '🔄 Restart Bridge'}
              </button>
            </div>
            {bridgeDown && (
              <p className="text-xs text-red-400 mt-2">
                Bridge jest niedostępny — nie można zrestartować
              </p>
            )}
          </div>
        </section>

      </div>

      {/* ── Restart Confirm Modal ── */}
      {showRestartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Restart Bridge</h3>
            <p className="text-[#4b4569] text-sm mb-6">
              Spowoduje chwilową niedostępność. Czy kontynuować?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRestartModal(false)}
                className="px-4 py-2 bg-[#252246] border border-[#3b3d7a] text-[#4b4569] rounded-lg text-sm hover:bg-[#2e2b5a]"
              >
                Anuluj
              </button>
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
