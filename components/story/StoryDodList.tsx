'use client'

// components/story/StoryDodList.tsx
// Definition of Done lista read-only checkboxów.
// Implementacja STORY-2.6.

interface Props {
  dod: string[]
  isDone: boolean
}

export function StoryDodList({ dod = [], isDone }: Props) {
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
        Definition of Done
      </div>

      {dod.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#3d3757' }}>
          Brak Definition of Done
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {dod.map((item, index) => (
            <label
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                cursor: 'default',
              }}
            >
              <input
                type="checkbox"
                disabled
                checked={isDone}
                aria-label={item}
                style={{
                  marginTop: '2px',
                  accentColor: '#7c3aed',
                  flexShrink: 0,
                  cursor: 'default',
                }}
              />
              <span style={{
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.4',
              }}>
                {item}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
