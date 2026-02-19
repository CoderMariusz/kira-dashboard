/**
 * Polish language utilities for formatting text with proper pluralization.
 */

/**
 * Polish pluralization rules.
 * 
 * In Polish, there are three forms:
 * - 1: singular form
 * - 2-4: plural form (few)
 * - 5-20, 0: plural form (many)
 * 
 * Note: For numbers ending in 2-4 but not in 12-14, use the "few" form.
 * 
 * @param count - The number to pluralize for
 * @param singular - Form for 1 item
 * @param few - Form for 2-4 items
 * @param many - Form for 5+ items or 0
 * @returns The correctly pluralized string
 * 
 * @example
 * ```ts
 * pluralize(1, 'minuta', 'minuty', 'minut') // 'minuta'
 * pluralize(2, 'minuta', 'minuty', 'minut') // 'minuty'
 * pluralize(5, 'minuta', 'minuty', 'minut') // 'minut'
 * pluralize(22, 'minuta', 'minuty', 'minut') // 'minuty'
 * ```
 */
export function polishPluralize(
  count: number,
  singular: string,
  few: string,
  many: string
): string {
  if (count === 1) return singular;
  
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  // 2-4, but NOT 12-14
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return few;
  }
  
  return many;
}
