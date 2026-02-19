'use client'
// components/home/overview/GreetingBanner.tsx
// AC-1, AC-2 — Powitanie z imieniem, datą po polsku i podsumowaniem

import { formatPolishDate } from '@/lib/utils/datePolish'

interface GreetingBannerProps {
  userName: string
  tasksToday: number | null   // null = jeszcze ładuje
  shoppingCount: number | null
}

export function GreetingBanner({ userName, tasksToday, shoppingCount }: GreetingBannerProps) {
  const { dayLine, yearLine } = formatPolishDate(new Date())

  const subtextTasks    = tasksToday    !== null ? `${tasksToday} zadań`    : '–'
  const subtextShopping = shoppingCount !== null ? `${shoppingCount} produktów` : '–'

  return (
    <div
      style={{
        background:   'linear-gradient(135deg, #2d1b4a 0%, #1a2744 60%, #1a1a2e 100%)',
        border:       '1px solid #4b3d7a',
        borderRadius: '12px',
        padding:      '18px 22px',
      }}
      className="flex flex-col sm:flex-row sm:items-center gap-3"
    >
      {/* Lewa strona — ikona + teksty */}
      <div className="flex items-center gap-3 flex-1">
        {/* Emoji ikona */}
        <div
          style={{
            width:        '48px',
            height:       '48px',
            borderRadius: '12px',
            background:   'linear-gradient(135deg, #ec4899, #f97316)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            flexShrink:   0,
            fontSize:     '22px',
          }}
          aria-hidden="true"
        >
          👋
        </div>

        {/* Tytuł + subtext */}
        <div>
          <h1
            style={{
              fontSize:       '20px',
              fontWeight:     800,
              backgroundImage: 'linear-gradient(135deg, #f9a8d4, #fed7aa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight:     '1.2',
            }}
          >
            Cześć, {userName}! 👋
          </h1>
          <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
            Masz {subtextTasks} na dziś i {subtextShopping} do kupienia.
          </p>
        </div>
      </div>

      {/* Prawa strona — data po polsku */}
      <div className="text-right sm:text-right pl-[60px] sm:pl-0">
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3' }}>
          {dayLine}
        </div>
        <div style={{ fontSize: '11px', color: '#4b4569', marginTop: '2px' }}>
          {yearLine}
        </div>
      </div>
    </div>
  )
}
