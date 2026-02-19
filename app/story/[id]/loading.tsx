// app/story/[id]/loading.tsx
// Next.js loading UI dla /story/[id].
// Wyświetlany podczas SSR/initial load.
// Implementacja STORY-2.6.

import { StorySkeleton } from '@/components/story/StorySkeleton'

export default function StoryDetailLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#13111c',
      padding: '18px 20px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Breadcrumb — statyczny podczas loading */}
        <nav
          aria-label="Breadcrumb navigation"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <span style={{ fontSize: '12px', color: '#818cf8' }}>Home</span>
          <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
          <span style={{ fontSize: '12px', color: '#818cf8' }}>Pipeline</span>
          <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Loading...</span>
        </nav>

        <StorySkeleton />
      </div>
    </div>
  )
}
