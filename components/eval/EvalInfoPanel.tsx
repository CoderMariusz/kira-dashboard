'use client'

// components/eval/EvalInfoPanel.tsx
// Collapsible info panel explaining the Eval system

import { useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export default function EvalInfoPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'rgba(129,140,248,0.05)',
          border: '1px solid #2a2540',
          borderRadius: '8px',
          padding: '12px 16px',
          cursor: 'pointer',
          color: '#a0a0b8',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'background 0.2s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>ℹ️</span>
          <span>Co to jest Eval?</span>
        </span>
        <span
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            fontSize: '12px',
          }}
        >
          ▼
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent
        role="region"
        aria-label="Informacje o systemie Eval"
      >
        <div
          style={{
            background: 'rgba(129,140,248,0.05)',
            border: '1px solid #2a2540',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '16px',
            marginTop: '-4px',
          }}
        >
          {/* Section: Co to jest Eval? */}
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#e6edf3',
                margin: '0 0 8px 0',
              }}
            >
              🎯 Co to jest Eval?
            </h4>
            <p
              style={{
                fontSize: '12px',
                color: '#a0a0b8',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              System Eval pozwala Mariuszowi testować czy Kira nadal działa
              poprawnie po zmianach w modelach lub kodzie.
            </p>
          </div>

          {/* Section: Golden Tasks */}
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#e6edf3',
                margin: '0 0 8px 0',
              }}
            >
              📋 Golden Tasks
            </h4>
            <p
              style={{
                fontSize: '12px',
                color: '#a0a0b8',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Zestaw zadań testowych z oczekiwanym outputem. Kira wykonuje je i
              porównuje wyniki — jeśli output się zmienił, jest to regresja.
            </p>
          </div>

          {/* Section: Jak interpretować wyniki? */}
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#e6edf3',
                margin: '0 0 8px 0',
              }}
            >
              📊 Jak interpretować wyniki?
            </h4>
            <ul
              style={{
                fontSize: '12px',
                color: '#a0a0b8',
                margin: 0,
                paddingLeft: '16px',
                lineHeight: 1.8,
                listStyle: 'none',
              }}
            >
              <li>
                <span style={{ color: '#4ade80' }}>✅ PASS</span> — output
                zgodny z oczekiwanym (diff_score ≥ 0.9)
              </li>
              <li>
                <span style={{ color: '#f87171' }}>❌ FAIL</span> — output
                znacząco różni się od oczekiwanego
              </li>
              <li>
                <span style={{ color: '#f87171' }}>🔴</span> Nowe FAILe vs
                poprzedni run — regresja wymagająca uwagi
              </li>
              <li>
                <span style={{ color: '#4ade80' }}>🟢</span> Naprawione PASSy —
                poprawa vs poprzedni run
              </li>
            </ul>
          </div>

          {/* Section: Kategorie */}
          <div>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#e6edf3',
                margin: '0 0 8px 0',
              }}
            >
              🏷️ Kategorie
            </h4>
            <p
              style={{
                fontSize: '12px',
                color: '#818cf8',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              API · Auth · CRUD · Pipeline · Reasoning · Home
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
