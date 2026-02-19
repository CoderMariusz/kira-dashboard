'use client'

// components/home/kanban/BoardSkeleton.tsx
// Stan ładowania tablicy kanban — AC-2

function CardSkeleton() {
  return (
    <div
      className="h-[80px] bg-[#13111c] rounded-[8px] mb-2 animate-pulse border border-[#2a2540]"
      role="presentation"
      aria-hidden="true"
    />
  )
}

function ColumnSkeleton() {
  return (
    <div
      className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] h-[400px] p-[12px]"
      aria-hidden="true"
    >
      {/* Belka nagłówkowa */}
      <div className="h-8 bg-[#2a2540] mb-3 rounded animate-pulse" />
      {/* Karty-szkielety */}
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

interface BoardSkeletonProps {
  columns?: number
}

export function BoardSkeleton({ columns = 3 }: BoardSkeletonProps) {
  return (
    <div
      className="grid grid-cols-3 gap-[14px]"
      aria-label="Ładowanie tablicy zadań..."
      aria-busy="true"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <ColumnSkeleton key={i} />
      ))}
    </div>
  )
}
