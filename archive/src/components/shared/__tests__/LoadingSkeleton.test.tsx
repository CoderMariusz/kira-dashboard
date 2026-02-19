import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from '../LoadingSkeleton';

describe('LoadingSkeleton (T3)', () => {
  // T3/AC1: Renders animated placeholder (progress bar + 3 category groups)
  it('renders progress bar skeleton', () => {
    render(<LoadingSkeleton />);
    
    const progressBar = screen.getByTestId('skeleton-progress-bar');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders 3 category group skeletons', () => {
    render(<LoadingSkeleton />);
    
    const categoryGroups = screen.getAllByTestId('skeleton-category-group');
    expect(categoryGroups).toHaveLength(3);
  });

  it('has animated pulse effect', () => {
    render(<LoadingSkeleton />);
    
    const progressBar = screen.getByTestId('skeleton-progress-bar');
    expect(progressBar).toHaveClass('animate-pulse');
  });

  // T3/AC3: Renders without errors in isolation
  it('renders without errors', () => {
    expect(() => render(<LoadingSkeleton />)).not.toThrow();
  });
});
