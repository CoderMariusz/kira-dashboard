// app/story/[id]/not-found.tsx
// Strona 404 gdy story nie istnieje.
// Implementacja STORY-2.6.

import Link from 'next/link'

export default function StoryNotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#13111c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb navigation"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '40px' }}
      >
        <Link href="/" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
          Home
        </Link>
        <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
        <Link href="/" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
          Pipeline
        </Link>
        <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Not Found
        </span>
      </nav>

      {/* Error content */}
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <h1 style={{
          fontSize: '24px',
          color: '#e6edf3',
          marginBottom: '12px',
          fontWeight: 700,
        }}>
          Story nie została znaleziona
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '28px',
          lineHeight: '1.5',
        }}>
          Podana story nie istnieje lub została usunięta.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            background: '#2a2540',
            color: '#6b7280',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
          }}
        >
          ← Wróć do Pipeline
        </Link>
      </div>
    </div>
  )
}
