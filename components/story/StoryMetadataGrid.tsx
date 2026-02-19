'use client'

// components/story/StoryMetadataGrid.tsx
// Siatka metadanych story: epic, domena, priorytet, szacunek, model, data.
// Implementacja STORY-2.6.

import type { Story } from '@/types/story.types'

interface Props {
  story: Story
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface MetaCellProps {
  label: string
  value: string
}

function MetaCell({ label, value }: MetaCellProps) {
  return (
    <div style={{
      background: '#13111c',
      borderRadius: '7px',
      padding: '8px 11px',
    }}>
      <div style={{
        fontSize: '10px',
        color: '#4b4569',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '13px',
        color: '#e6edf3',
        fontWeight: 600,
      }}>
        {value}
      </div>
    </div>
  )
}

export function StoryMetadataGrid({ story }: Props) {
  return (
    <div>
      <div style={{
        fontSize: '11px',
        color: '#4b4569',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '8px',
        fontWeight: 600,
      }}>
        Metadata
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
      }}>
        <MetaCell
          label="Epic"
          value={`${story.epic} — ${story.epicTitle}`}
        />
        <MetaCell
          label="Domena"
          value={story.domain}
        />
        <MetaCell
          label="Priorytet"
          value={story.priority}
        />
        <MetaCell
          label="Szacunek"
          value={`${story.estimatedEffort}h`}
        />
        <MetaCell
          label="Model"
          value={story.assignedModel}
        />
        <MetaCell
          label="Utworzono"
          value={formatDate(story.createdAt)}
        />
      </div>
    </div>
  )
}
