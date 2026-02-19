// components/overview/KiraBanner.tsx
// Statyczny banner Kira v1.0 z tagami capabilities i offline indicator.

import React from 'react'

interface TagProps {
  type: 'done' | 'new' | 'lock'
  children: React.ReactNode
}

const tagStyles: Record<TagProps['type'], React.CSSProperties> = {
  done: {
    background: '#1a3a1a',
    border: '1px solid #2a5a2a',
    color: '#4ade80',
  },
  new: {
    background: '#2d1b4a',
    border: '1px solid #5b21b6',
    color: '#c4b5fd',
  },
  lock: {
    background: '#1a1730',
    border: '1px solid #2a2540',
    color: '#3d3757',
  },
}

function Tag({ type, children }: TagProps) {
  return (
    <span
      style={{
        ...tagStyles[type],
        fontSize: '10px',
        padding: '3px 9px',
        borderRadius: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

interface KiraBannerProps {
  isOffline?: boolean
}

export default function KiraBanner({ isOffline }: KiraBannerProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #1a2744 100%)',
        border: '1px solid #3b3d7a',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      {/* Robot icon */}
      <div
        style={{
          width: '42px',
          height: '42px',
          background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
          borderRadius: '11px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
          boxShadow: '0 2px 14px rgba(124,58,237,.4)',
        }}
      >
        🤖
      </div>

      {/* Title + subtitle */}
      <div>
        <div
          style={{
            fontSize: '19px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #c4b5fd, #93c5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Kira v1.0
        </div>
        <div
          style={{
            fontSize: '11px',
            color: isOffline ? '#f87171' : '#6b7280',
            marginTop: '2px',
          }}
        >
          {isOffline
            ? '⚠️ Bridge offline — dane mogą być nieaktualne'
            : 'AI Pipeline Orchestrator · 158 stories shipped · Bridge API live · EPIC-11 CI/CD next'}
        </div>
      </div>

      {/* Capability tags */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginLeft: 'auto',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: '500px',
        }}
      >
        <Tag type="done">✅ Multi-project</Tag>
        <Tag type="done">✅ Auto run tracking</Tag>
        <Tag type="new">🆕 Lesson hooks</Tag>
        <Tag type="new">🆕 memU events</Tag>
        <Tag type="new">🆕 Eval CLI</Tag>
        <Tag type="new">🆕 Dashboard</Tag>
        <Tag type="lock">🔒 CI/CD EPIC-11</Tag>
      </div>
    </div>
  )
}
