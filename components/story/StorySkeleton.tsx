'use client'

// components/story/StorySkeleton.tsx
// Animated pulse skeleton dla loading state Story Detail.
// Implementacja STORY-2.6.

export function StorySkeleton() {
  return (
    <div>
      {/* Hero skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div
          className="animate-pulse"
          style={{ background: '#2a2540', borderRadius: '6px', width: '80px', height: '24px' }}
        />
        <div
          className="animate-pulse"
          style={{ background: '#2a2540', borderRadius: '6px', width: '300px', height: '32px' }}
        />
        <div
          className="animate-pulse"
          style={{ background: '#2a2540', borderRadius: '6px', width: '90px', height: '24px' }}
        />
        <div
          className="animate-pulse"
          style={{ background: '#2a2540', borderRadius: '6px', width: '90px', height: '24px' }}
        />
      </div>

      {/* Metadata grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ background: '#2a2540', borderRadius: '6px', height: '52px' }}
          />
        ))}
      </div>

      {/* Runs skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ background: '#2a2540', borderRadius: '6px', height: '38px', marginBottom: '5px' }}
        />
      ))}
    </div>
  )
}
