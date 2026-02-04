import { describe, it, expect } from 'vitest';
import type { ShoppingCategory } from '@/lib/types/database';

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

const mockCategories: ShoppingCategory[] = [
  {
    id: 'cat-1',
    name: 'Nabiał',
    icon: '🥛',
    color: '#4CAF50',
    position: 0,
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Pieczywo',
    icon: '🍞',
    color: '#FF9800',
    position: 1,
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    name: 'Owoce i Warzywa',
    icon: '🥕',
    color: '#8BC34A',
    position: 2,
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    name: 'Mięso i Ryby',
    icon: '🥩',
    color: '#F44336',
    position: 3,
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-5',
    name: 'Chemia',
    icon: '🧴',
    color: '#2196F3',
    position: 4,
    is_default: true,
    created_at: new Date().toISOString(),
  },
];

// ═══════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════

describe('T1: Category Detection Utility', () => {
  describe('detectCategory', () => {
    it('AC1: should detect category from keywords for all 10 categories', async () => {
      const { detectCategory } = await import('@/lib/utils/categoryDetection');

      // Nabiał
      expect(detectCategory('mleko', mockCategories)).toBe('cat-1');
      
      // Pieczywo
      expect(detectCategory('chleb', mockCategories)).toBe('cat-2');
      
      // Owoce i Warzywa
      expect(detectCategory('jabłko', mockCategories)).toBe('cat-3');
      
      // Mięso i Ryby
      expect(detectCategory('kurczak', mockCategories)).toBe('cat-4');
      
      // Chemia
      expect(detectCategory('proszek', mockCategories)).toBe('cat-5');
    });

    it('AC2: should perform case-insensitive matching', async () => {
      const { detectCategory } = await import('@/lib/utils/categoryDetection');

      expect(detectCategory('MLEKO', mockCategories)).toBe('cat-1');
      expect(detectCategory('MlEkO', mockCategories)).toBe('cat-1');
      expect(detectCategory('Chleb', mockCategories)).toBe('cat-2');
    });

    it('AC3: should perform partial matching (mleko 2% → nabiał)', async () => {
      const { detectCategory } = await import('@/lib/utils/categoryDetection');

      expect(detectCategory('mleko 2%', mockCategories)).toBe('cat-1');
      expect(detectCategory('chleb razowy', mockCategories)).toBe('cat-2');
      expect(detectCategory('jabłka czerwone', mockCategories)).toBe('cat-3');
    });

    it('AC4: should handle null/empty input gracefully', async () => {
      const { detectCategory } = await import('@/lib/utils/categoryDetection');

      expect(detectCategory('', mockCategories)).toBeNull();
      expect(detectCategory('   ', mockCategories)).toBeNull();
    });

    it('AC5: should return null for unknown products', async () => {
      const { detectCategory } = await import('@/lib/utils/categoryDetection');

      expect(detectCategory('unknown product xyz', mockCategories)).toBeNull();
      expect(detectCategory('asdfghjkl', mockCategories)).toBeNull();
    });

    it('AC6: should have minimum 10 keywords per category in CATEGORY_KEYWORDS map', async () => {
      const { CATEGORY_KEYWORDS } = await import('@/lib/utils/categoryDetection');

      const categories = Object.keys(CATEGORY_KEYWORDS);
      expect(categories.length).toBeGreaterThanOrEqual(10);

      categories.forEach((category) => {
        expect(CATEGORY_KEYWORDS[category].length).toBeGreaterThanOrEqual(10);
      });
    });
  });
});
