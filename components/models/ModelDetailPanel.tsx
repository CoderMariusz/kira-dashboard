'use client'
// components/models/ModelDetailPanel.tsx
// Placeholder — pełna implementacja w STORY-5.6.

interface ModelDetailPanelProps {
  alias: string
  displayName: string
}

export function ModelDetailPanel({ displayName }: ModelDetailPanelProps) {
  return (
    <div className="py-4 text-center text-slate-400 text-sm">
      <span className="opacity-60">Panel szczegółów dla <span className="text-[#818cf8]">{displayName}</span> — wkrótce</span>
    </div>
  )
}
