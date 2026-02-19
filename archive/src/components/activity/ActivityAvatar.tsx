'use client';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface ActivityAvatarProps {
  actorName: string;
  actorId: string | null;
  size?: 'sm' | 'md' | 'lg';
}

// ══════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════

const SIZE_CLASSES = {
  sm: 'w-5 h-5 text-xs',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const;

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityAvatar
// ══════════════════════════════════════════════════════════

/**
 * Renders an avatar for activity feed entries.
 * Shows a robot emoji for Kira (null actor_id) or user initials for humans.
 * 
 * @param actorName - Display name of the actor
 * @param actorId - ID of the actor (null for Kira)
 * @param size - Avatar size variant (sm, md, or lg)
 */
export function ActivityAvatar({ actorName, actorId, size = 'md' }: ActivityAvatarProps) {
  const isKira = !actorId || actorName === 'Kira';
  const displayName = actorName || 'Kira';
  const sizeClasses = SIZE_CLASSES[size];

  if (isKira) {
    if (size === 'sm') {
      // For small avatars, use div with emoji
      return (
        <div
          className={`${sizeClasses} rounded-full bg-purple-100 flex items-center justify-center`}
          aria-label="Kira"
          role="img"
        >
          🤖
        </div>
      );
    }

    // For medium/large avatars, use SVG image
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23e9d5ff'/><text x='50' y='65' font-size='50' text-anchor='middle'>🤖</text></svg>`
    );

    return (
      <img
        src={`data:image/svg+xml,${svg}`}
        alt={displayName}
        className={`${sizeClasses} rounded-full object-cover`}
      />
    );
  }

  // Get initials from name
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (size === 'sm') {
    // For small avatars, use div with initials
    return (
      <div
        className={`${sizeClasses} rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium`}
        aria-label={displayName}
        role="img"
      >
        {initials}
      </div>
    );
  }

  // For medium/large avatars, use SVG image
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23dbeafe'/><text x='50' y='65' font-size='${size === 'lg' ? '45' : '40'}' text-anchor='middle' fill='%232563eb' font-family='sans-serif' font-weight='500'>${initials}</text></svg>`
  );

  return (
    <img
      src={`data:image/svg+xml,${svg}`}
      alt={displayName}
      className={`${sizeClasses} rounded-full object-cover`}
    />
  );
}
