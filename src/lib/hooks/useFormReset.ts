'use client';

import { useEffect } from 'react';

/**
 * Hook that automatically resets form state when a condition is met.
 * 
 * Useful for clearing forms after successful mutations or when
 * modals close. Centralizes form reset logic to eliminate duplication.
 * 
 * @param isSuccess - Condition that triggers reset (typically mutation success)
 * @param resetFn - Function to execute when condition is true
 * @param dependencies - Additional dependencies for effect
 * 
 * @example
 * ```ts
 * const { mutate, isSuccess } = useMutation(addItem);
 * 
 * useFormReset(isSuccess, () => {
 *   setName('');
 *   setQuantity(1);
 * }, []);
 * ```
 */
export function useFormReset(
  isSuccess: boolean,
  resetFn: () => void,
  dependencies: React.DependencyList = []
): void {
  useEffect(() => {
    if (isSuccess) {
      resetFn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, ...dependencies]);
}
