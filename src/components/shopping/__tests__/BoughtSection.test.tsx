import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoughtSection } from '../BoughtSection';
import type { ShoppingItem } from '@/lib/types/database';

const mockItems: ShoppingItem[] = [
  {
    id: '1',
    list_id: 'list-1',
    name: 'Jabłka',
    quantity: 2,
    unit: 'kg',
    category_id: 'cat-1',
    category_name: 'Owoce i warzywa',
    store: null,
    is_bought: false, // not bought
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '2',
    list_id: 'list-1',
    name: 'Mleko',
    quantity: 1,
    unit: 'l',
    category_id: 'cat-2',
    category_name: 'Nabiał',
    store: null,
    is_bought: true, // bought
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

describe('BoughtSection (T4)', () => {
  // T4/AC4: Displays only bought items (is_bought=true)
  it('displays only bought items', () => {
    render(<BoughtSection items={mockItems} />);
    
    expect(screen.getByText('Mleko')).toBeInTheDocument();
    expect(screen.queryByText('Jabłka')).not.toBeInTheDocument();
  });

  // T4/AC5: Collapsed by default (details without open)
  it('is collapsed by default (details element without open)', () => {
    const { container } = render(<BoughtSection items={mockItems} />);
    
    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();
    expect(details?.hasAttribute('open')).toBe(false);
  });

  // T4/AC6: Returns null when no bought items
  it('returns null when no bought items exist', () => {
    const activeitems = mockItems.map(item => ({ ...item, is_bought: false }));
    const { container } = render(<BoughtSection items={activeitems} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('returns null when items array is empty', () => {
    const { container } = render(<BoughtSection items={[]} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('displays bought item count in summary', () => {
    render(<BoughtSection items={mockItems} />);
    
    // Should show "Kupione (1)"
    expect(screen.getByText(/Kupione/)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });
});
