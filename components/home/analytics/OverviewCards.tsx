/**
 * OverviewCards — 3 karty statystyk analytics (dark theme)
 */

'use client';

interface MostActiveUser {
  name: string;
  count: number;
  trendPercent: number;
}

export interface OverviewData {
  completedTasks: number;
  completedTasksTrend: number;
  shoppingBought: number;
  shoppingBoughtTrend: number;
  mostActiveUser: MostActiveUser | null;
}

interface OverviewCardsProps {
  data: OverviewData | null;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse h-24 bg-[#2a2540] rounded-lg" />
  );
}

export function OverviewCards({ data }: OverviewCardsProps) {
  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const { completedTasks, completedTasksTrend, shoppingBought, shoppingBoughtTrend, mostActiveUser } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Karta 1: Ukończone zadania */}
      <div
        className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-4 border-l-[3px]"
        style={{ borderLeftColor: '#10B981' }}
      >
        <p className="text-[10px] uppercase text-[#4b4569] tracking-wide mb-1">
          ✅ Ukończone zadania
        </p>
        <p className="text-[26px] font-extrabold text-[#e6edf3] leading-none">
          {completedTasks}
        </p>
        <p className="text-[10px] text-[#4b4569] mt-1">w tym miesiącu</p>
        {completedTasksTrend !== 0 && (
          <p className="text-[11px] mt-1" style={{ color: completedTasksTrend >= 0 ? '#4ade80' : '#f85149' }}>
            {completedTasksTrend >= 0 ? '↑' : '↓'} {completedTasksTrend >= 0 ? '+' : ''}{completedTasksTrend} vs poprzedni miesiąc
          </p>
        )}
      </div>

      {/* Karta 2: Zakupione produkty */}
      <div
        className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-4 border-l-[3px]"
        style={{ borderLeftColor: '#3B82F6' }}
      >
        <p className="text-[10px] uppercase text-[#4b4569] tracking-wide mb-1">
          🛒 Zakupione produkty
        </p>
        <p className="text-[26px] font-extrabold text-[#e6edf3] leading-none">
          {shoppingBought}
        </p>
        <p className="text-[10px] text-[#4b4569] mt-1">w tym miesiącu</p>
        {shoppingBoughtTrend !== 0 && (
          <p className="text-[11px] mt-1" style={{ color: shoppingBoughtTrend >= 0 ? '#4ade80' : '#f85149' }}>
            {shoppingBoughtTrend >= 0 ? '↑' : '↓'} {shoppingBoughtTrend >= 0 ? '+' : ''}{shoppingBoughtTrend} vs poprzedni miesiąc
          </p>
        )}
      </div>

      {/* Karta 3: Najaktywniejszy */}
      <div
        className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-4 border-l-[3px]"
        style={{ borderLeftColor: '#8B5CF6' }}
      >
        <p className="text-[10px] uppercase text-[#4b4569] tracking-wide mb-1">
          🏆 Najaktywniejszy
        </p>
        {mostActiveUser ? (
          <>
            <p className="text-[20px] font-extrabold text-[#e6edf3] leading-none truncate">
              {mostActiveUser.name}
            </p>
            <p className="text-[10px] text-[#4b4569] mt-1">
              {mostActiveUser.count} akcje w tym miesiącu
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#f9a8d4' }}>
              🔥 +{mostActiveUser.trendPercent}% vs poprzedni
            </p>
          </>
        ) : (
          <>
            <p className="text-[20px] font-extrabold text-[#e6edf3] leading-none">—</p>
            <p className="text-[10px] text-[#4b4569] mt-1">Brak aktywności w tym miesiącu</p>
          </>
        )}
      </div>
    </div>
  );
}
