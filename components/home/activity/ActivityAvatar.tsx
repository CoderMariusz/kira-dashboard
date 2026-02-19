'use client';

// ══════════════════════════════════════════════════════════
// CONSTANTS — deterministyczne gradienty per actorId
// ══════════════════════════════════════════════════════════

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#ec4899,#f97316)', // różowy-pomarańczowy
  'linear-gradient(135deg,#3b82f6,#06b6d4)', // niebieski-cyan
  'linear-gradient(135deg,#a78bfa,#60a5fa)', // fioletowy-niebieski
  'linear-gradient(135deg,#34d399,#06b6d4)', // zielony-cyan
  'linear-gradient(135deg,#f59e0b,#ef4444)', // żółty-czerwony
] as const;

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function getAvatarGradient(actorId: string | null): string {
  if (!actorId) return '#e9d5ff'; // Kira — solid purple
  const hash = actorId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0]!;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface ActivityAvatarProps {
  actorName: string;
  actorId: string | null;
  size?: 'sm' | 'md';
}

const SIZE_MAP: Record<'sm' | 'md', string> = {
  sm: 'w-[22px] h-[22px] text-[9px]',
  md: 'w-[32px] h-[32px] text-[12px]',
};

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityAvatar
// ══════════════════════════════════════════════════════════

/**
 * Renders an avatar for activity feed entries.
 * Shows a robot emoji for Kira (null actor_id) or user initials with gradient for humans.
 * 
 * AC-6: ActivityAvatar — inicjały w kolorowym kółku
 */
export function ActivityAvatar({ actorName, actorId, size = 'md' }: ActivityAvatarProps) {
  const isKira = !actorId || actorName === 'Kira';
  const sizeClass = SIZE_MAP[size];

  if (isKira) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{ background: '#e9d5ff' }}
        role="img"
        aria-label="Kira"
      >
        🤖
      </div>
    );
  }

  const initials = getInitials(actorName || 'Użytkownik');
  const gradient = getAvatarGradient(actorId);

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white`}
      style={{ background: gradient }}
      role="img"
      aria-label={actorName}
    >
      {initials}
    </div>
  );
}
