import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// Predefiniowane kolory dla labeli
// Kolor jest deterministyczny — oparty na hash nazwy
// ═══════════════════════════════════════════════════════════

const LABEL_COLORS = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
  { bg: '#FCE7F3', text: '#BE185D' }, // pink
  { bg: '#D1FAE5', text: '#065F46' }, // green
  { bg: '#FEF3C7', text: '#92400E' }, // amber
  { bg: '#EDE9FE', text: '#5B21B6' }, // violet
  { bg: '#FFE4E6', text: '#9F1239' }, // rose
  { bg: '#CCFBF1', text: '#115E59' }, // teal
  { bg: '#FEE2E2', text: '#991B1B' }, // red
] as const;

function getLabelColor(label: string) {
  // Prosty hash — sumuj char codes i weź modulo
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

interface LabelBadgeProps {
  label: string;
  className?: string;
  /** Czy można usunąć label (wyświetla ×) */
  onRemove?: () => void;
}

export function LabelBadge({ label, className, onRemove }: LabelBadgeProps) {
  const color = getLabelColor(label);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
      style={{ color: color.text, backgroundColor: color.bg }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:opacity-70"
          aria-label={`Usuń label ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
