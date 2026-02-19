// lib/utils/datePolish.ts
// Polska lokalizacja daty — BEZ zewnętrznych bibliotek locale

const DAYS_PL = [
  'Niedziela', 'Poniedziałek', 'Wtorek', 'Środa',
  'Czwartek', 'Piątek', 'Sobota',
]

const MONTHS_SHORT_PL = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
]

// ISO week number (standard ISO 8601)
function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  )
}

export interface PolishDate {
  dayLine: string  // np. "Czwartek, 19 lut"
  yearLine: string // np. "2026 · tydzień 8"
}

/**
 * Formatuje datę po polsku.
 * Nie wymaga date-fns/locale/pl ani innych bibliotek locale.
 */
export function formatPolishDate(date: Date): PolishDate {
  const dayName = DAYS_PL[date.getDay()]
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT_PL[date.getMonth()]
  const year = date.getFullYear()
  const week = getISOWeek(date)

  return {
    dayLine: `${dayName}, ${day} ${month}`,
    yearLine: `${year} · tydzień ${week}`,
  }
}
