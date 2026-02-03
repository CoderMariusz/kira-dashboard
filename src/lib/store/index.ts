/**
 * Zustand Global UI Store
 * Kira Dashboard - Client-side state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export type BoardType = 'home' | 'work';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Current board view
  currentBoard: BoardType;
  setBoard: (board: BoardType) => void;

  // Mobile menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Theme (handled by next-themes, but we can track preference)
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

// ══════════════════════════════════════════════════════════
// STORE
// ══════════════════════════════════════════════════════════

/**
 * Main UI store with localStorage persistence
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar state
      sidebarOpen: true, // Desktop: open by default
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Board state
      currentBoard: 'home', // Default to home board
      setBoard: (board) => set({ currentBoard: board }),

      // Mobile menu
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'kira-dashboard-ui', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist specific keys
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        currentBoard: state.currentBoard,
        theme: state.theme,
      }),
    }
  )
);

// ══════════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════════

/**
 * Sidebar selectors (optimized for re-renders)
 */
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useToggleSidebar = () => useUIStore((state) => state.toggleSidebar);

/**
 * Board selectors
 */
export const useCurrentBoard = () => useUIStore((state) => state.currentBoard);
export const useSetBoard = () => useUIStore((state) => state.setBoard);

/**
 * Mobile menu selectors
 */
export const useMobileMenuOpen = () => useUIStore((state) => state.mobileMenuOpen);
export const useSetMobileMenuOpen = () => useUIStore((state) => state.setMobileMenuOpen);

/**
 * Theme selectors
 */
export const useTheme = () => useUIStore((state) => state.theme);
export const useSetTheme = () => useUIStore((state) => state.setTheme);
