'use client';

import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions {
  key: string;
  interval?: number; // milliseconds, default 10000 (10 seconds)
  enabled?: boolean;
}

/**
 * Custom hook for auto-saving data to localStorage
 * @param data - The data to be saved
 * @param options - Configuration options
 * @returns void
 * 
 * Example:
 * const [formData, setFormData] = useState({...});
 * useAutoSave(formData, { key: 'myForm', interval: 10000 });
 */
export function useAutoSave(
  data: unknown,
  options: AutoSaveOptions
): void {
  const { key, interval = 10000, enabled = true } = options;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  const saveToLocalStorage = useCallback(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    try {
      const serializedData = JSON.stringify(data);
      
      // Only save if data has changed
      if (serializedData !== lastSavedRef.current) {
        localStorage.setItem(key, serializedData);
        lastSavedRef.current = serializedData;
        console.log(`[AutoSave] Saved "${key}" to localStorage`);
      }
    } catch (error) {
      console.error(`[AutoSave] Failed to save "${key}":`, error);
    }
  }, [data, key, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(saveToLocalStorage, interval);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, saveToLocalStorage, interval, enabled]);

  // Save on window unload to prevent data loss on crash
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToLocalStorage, enabled]);
}

/**
 * Retrieve auto-saved data from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - Default value if key doesn't exist or fails to parse
 * @returns The parsed data or default value
 */
export function getAutoSavedData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`[AutoSave] Failed to retrieve "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Clear auto-saved data from localStorage
 * @param key - The key to clear
 */
export function clearAutoSavedData(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(key);
    console.log(`[AutoSave] Cleared "${key}" from localStorage`);
  } catch (error) {
    console.error(`[AutoSave] Failed to clear "${key}":`, error);
  }
}
