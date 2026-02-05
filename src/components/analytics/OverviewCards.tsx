/**
 * OverviewCards Component
 * Kira Dashboard - 4 stat cards for analytics overview
 */

'use client';

import { ReactNode } from 'react';

interface OverviewData {
  completed: number;
  active: number;
  overdue: number;
  completionRate: number;
}

interface OverviewCardsProps {
  data: OverviewData | null;
}

interface StatCard {
  label: string;
  value: number;
  displayValue: string;
  color: string;
  accentColor: string;
  testId: string;
}

const CARDS_CONFIG: Omit<StatCard, 'value' | 'displayValue' | 'testId'>[] = [
  { label: 'Completed', color: '#10B981', accentColor: 'bg-emerald-500' },
  { label: 'Active', color: '#3B82F6', accentColor: 'bg-blue-500' },
  { label: 'Completion Rate', color: '#8B5CF6', accentColor: 'bg-violet-500' },
  { label: 'Overdue', color: '#EF4444', accentColor: 'bg-red-500' },
];

function getCardValue(config: typeof CARDS_CONFIG[0], data: OverviewData): { value: number; displayValue: string; testId: string } {
  let value: number;
  let displayValue: string;
  let testId: string;

  switch (config.label) {
    case 'Completed':
      value = data.completed;
      displayValue = String(data.completed);
      testId = 'stat-completed';
      break;
    case 'Active':
      value = data.active;
      displayValue = String(data.active);
      testId = 'stat-active';
      break;
    case 'Completion Rate':
      value = data.completionRate;
      displayValue = `${data.completionRate}%`;
      testId = 'stat-completion-rate';
      break;
    case 'Overdue':
      value = data.overdue;
      displayValue = String(data.overdue);
      testId = 'stat-overdue';
      break;
    default:
      value = 0;
      displayValue = '0';
      testId = 'stat-unknown';
  }

  return { value, displayValue, testId };
}

export function OverviewCards({ data }: OverviewCardsProps) {
  if (!data) {
    return null;
  }

  const cards: StatCard[] = CARDS_CONFIG.map((config) => {
    const { value, displayValue, testId } = getCardValue(config, data);
    return {
      ...config,
      value,
      displayValue,
      testId,
    };
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg shadow p-6 border-l-4"
          style={{ borderLeftColor: card.color }}
          data-accent
        >
          <p className="text-sm text-gray-500 mb-1">{card.label}</p>
          <p className="text-2xl font-bold" data-testid={card.testId}>
            {card.displayValue}
          </p>
          <div className={`h-1 w-full mt-3 rounded ${card.accentColor}`} />
        </div>
      ))}
    </div>
  );
}
