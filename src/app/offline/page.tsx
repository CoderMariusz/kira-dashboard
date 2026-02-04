'use client';

export default function OfflinePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📡</div>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#1f2937',
        }}
      >
        You&apos;re Offline
      </h1>
      <p
        style={{
          color: '#6b7280',
          maxWidth: '28rem',
          marginBottom: '1.5rem',
          lineHeight: '1.5',
        }}
      >
        It looks like you&apos;ve lost your internet connection. Some features
        may not be available.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.backgroundColor = '#2563EB')
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.backgroundColor = '#3B82F6')
        }
      >
        Try Again
      </button>
    </div>
  );
}
