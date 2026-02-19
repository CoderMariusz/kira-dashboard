// src/components/layout/SidebarSkeleton.tsx

export function SidebarSkeleton() {
  return (
    <div className="flex-1 p-1.5 space-y-1" aria-label="Ładowanie nawigacji..." aria-busy="true">
      {/* Skeleton etykiety sekcji */}
      <div className="h-3 w-16 bg-[#2a2540] rounded animate-pulse mx-2 my-2.5" />
      {/* 3 skeleton NavItem */}
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="h-7 w-full bg-[#2a2540] rounded-lg animate-pulse"
          style={{ opacity: 1 - i * 0.1 }}  // lekkie zanikanie dla estetyki
        />
      ))}
    </div>
  );
}

export function UserPillSkeleton() {
  return (
    <div className="flex items-center gap-2 p-2.5 m-2.5 bg-[#13111c] border border-[#2a2540] rounded-lg animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-7 h-7 rounded-full bg-[#2a2540] flex-shrink-0" />
      {/* Tekst skeleton */}
      <div className="flex-1 space-y-1">
        <div className="h-2.5 w-28 bg-[#2a2540] rounded" />
        <div className="h-2 w-16 bg-[#2a2540] rounded" />
      </div>
    </div>
  );
}
