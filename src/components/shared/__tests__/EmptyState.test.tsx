import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState (T3)', () => {
  // T3/AC2: Accepts icon, title, description props
  it('renders with icon, title, and description', () => {
    render(
      <EmptyState
        icon="🛒"
        title="Brak produktów"
        description="Dodaj pierwszy produkt do listy zakupów"
      />
    );
    
    expect(screen.getByText('🛒')).toBeInTheDocument();
    expect(screen.getByText('Brak produktów')).toBeInTheDocument();
    expect(screen.getByText('Dodaj pierwszy produkt do listy zakupów')).toBeInTheDocument();
  });

  it('renders only title when description is omitted', () => {
    render(
      <EmptyState
        icon="📝"
        title="Pusta lista"
      />
    );
    
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('Pusta lista')).toBeInTheDocument();
  });

  it('renders centered layout', () => {
    const { container } = render(
      <EmptyState
        icon="🎯"
        title="Test"
        description="Test description"
      />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });

  // T3/AC3: Renders without errors in isolation
  it('renders without errors', () => {
    expect(() => render(<EmptyState icon="✅" title="Test" />)).not.toThrow();
  });
});
