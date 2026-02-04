interface EmptyStateProps {
  /** Emoji or icon to display */
  icon: string;
  /** Empty state title */
  title: string;
  /** Empty state description */
  description: string;
}

/**
 * Reusable empty state display with icon, title, and description.
 * 
 * @component
 * @example
 * ```tsx
 * <EmptyState
 *   icon="🛒"
 *   title="No items yet"
 *   description="Add your first item to get started"
 * />
 * ```
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4" aria-hidden="true">{icon}</div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
