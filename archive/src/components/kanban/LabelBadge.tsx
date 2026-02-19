import { cn } from '@/lib/utils';
import type { Label } from '@/lib/types/app';

/**
 * Get contrast colors for a background color
 * @param backgroundColor - The hex color code
 * @returns Object with background and text colors for contrast
 */
function getContrastColors(backgroundColor: string): { bg: string; text: string } {
  // Map of background colors to their expected contrast colors
  const colorMap: Record<string, { bg: string; text: string }> = {
    '#EF4444': { bg: '#FEE2E2', text: '#991B1B' }, // Red
    '#10B981': { bg: '#D1FAE5', text: '#065F46' }, // Green
    '#F59E0B': { bg: '#FEF3C7', text: '#92400E' }, // Amber
    '#3B82F6': { bg: '#DBEAFE', text: '#1D4ED8' }, // Blue
    '#8B5CF6': { bg: '#EDE9FE', text: '#5B21B6' }, // Violet
    '#EC4899': { bg: '#FCE7F3', text: '#BE185D' }, // Pink
    '#6366F1': { bg: '#E0E7FF', text: '#3730A3' }, // Indigo
    '#F97316': { bg: '#FFEDD5', text: '#9A3412' }, // Orange
  };

  return colorMap[backgroundColor] ?? { bg: '#F3F4F6', text: '#374151' };
}

interface LabelBadgeProps {
  label: Label;
  className?: string;
  /** Optional callback to remove label */
  onRemove?: () => void;
}

/**
 * Display a label as a badge with color styling
 */
export function LabelBadge({ label, className, onRemove }: LabelBadgeProps) {
  const colors = getContrastColors(label.color);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
      style={{ 
        color: colors.text, 
        backgroundColor: colors.bg,
        borderColor: label.color,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:opacity-70"
          aria-label={`Usuń label ${label.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
