/**
 * Safely toggle an item in an array
 * @param array - The array to modify
 * @param item - The item to toggle
 * @returns New array with item toggled
 */
export function toggleInArray<T>(array: T[], item: T): T[] {
  return array.includes(item)
    ? array.filter((i) => i !== item)
    : [...array, item];
}

/**
 * Safe localStorage accessor for SSR/test compatibility
 */
export const localStorage = {
  /**
   * Get item from localStorage
   * Returns null if not available (SSR) or on error
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Set item in localStorage
   * Silently fails if not available (SSR) or on error
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Remove item from localStorage
   * Silently fails if not available (SSR) or on error
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Clear all items from localStorage
   * Silently fails if not available (SSR) or on error
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch {
      // Ignore storage errors
    }
  },
};
