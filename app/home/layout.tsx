// app/home/layout.tsx
// Layout dla modułu home — uproszczony, bez sidebar Kira

import type { ReactNode } from 'react'

interface HomeLayoutProps {
  children: ReactNode
}

export default function HomeLayout({ children }: HomeLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: '#0d0b17', color: '#e6edf3' }}>
      {children}
    </div>
  )
}
