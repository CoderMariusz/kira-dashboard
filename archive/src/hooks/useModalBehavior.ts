/**
 * Custom hook for common modal behaviors
 * Handles escape key, auto-focus, and lifecycle management
 */

import { useEffect, useRef, RefObject } from 'react';

interface UseModalBehaviorOptions {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  autoFocusRef?: RefObject<HTMLElement>;
}

/**
 * Provides common modal behaviors:
 * - Escape key to close
 * - Auto-focus on open
 * - Cleanup on unmount
 */
export function useModalBehavior({
  isOpen,
  onClose,
  onOpen,
  autoFocusRef,
}: UseModalBehaviorOptions) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle open lifecycle
  useEffect(() => {
    if (isOpen) {
      onOpen?.();
      
      // Auto-focus after short delay to allow render
      if (autoFocusRef?.current) {
        setTimeout(() => autoFocusRef.current?.focus(), 100);
      }
    }
  }, [isOpen, onOpen, autoFocusRef]);
}

/**
 * Hook for managing focus reference
 * Returns a ref that can be attached to an input
 */
export function useFocusRef<T extends HTMLElement>() {
  return useRef<T>(null);
}
