import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EpicCard } from '@/components/epics/EpicCard'

// Mock Framer Motion for tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('EpicCard Component', () => {
  const mockEpic = {
    id: '1',
    title: 'Test Epic',
    description: 'Test description',
    stories: [
      { id: 's1', title: 'Story 1', status: 'idea' },
      { id: 's2', title: 'Story 2', status: 'done' },
      { id: 's3', title: 'Story 3', status: 'in_progress' },
    ],
  }

  describe('Rendering', () => {
    it('should render epic title', () => {
      render(<EpicCard epic={mockEpic} />)
      expect(screen.getByText('Test Epic')).toBeInTheDocument()
    })

    it('should render story count badge', () => {
      render(<EpicCard epic={mockEpic} />)
      expect(screen.getByText('3 stories')).toBeInTheDocument()
    })

    it('should render progress bar', () => {
      render(<EpicCard epic={mockEpic} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('should calculate correct progress percentage (1/3 = 33%)', () => {
      render(<EpicCard epic={mockEpic} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveStyle({ width: '33%' })
    })

    it('should render collapse/expand button', () => {
      render(<EpicCard epic={mockEpic} />)
      const button = screen.getByRole('button', { name: /collapse|expand/i })
      expect(button).toBeInTheDocument()
    })

    it('should show collapse icon when expanded', () => {
      render(<EpicCard epic={mockEpic} defaultExpanded={true} />)
      const button = screen.getByRole('button', { name: /collapse/i })
      expect(button).toBeInTheDocument()
    })

    it('should show expand icon when collapsed', () => {
      render(<EpicCard epic={mockEpic} defaultExpanded={false} />)
      const button = screen.getByRole('button', { name: /expand/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('Collapse/Expand Functionality', () => {
    it('should be expanded by default', () => {
      render(<EpicCard epic={mockEpic} />)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
    })

    it('should collapse when collapse button clicked', () => {
      render(<EpicCard epic={mockEpic} defaultExpanded={true} />)
      const collapseButton = screen.getByRole('button', { name: /collapse/i })
      fireEvent.click(collapseButton)
      expect(screen.queryByText('Story 1')).not.toBeInTheDocument()
    })

    it('should expand when expand button clicked', () => {
      render(<EpicCard epic={mockEpic} defaultExpanded={false} />)
      const expandButton = screen.getByRole('button', { name: /expand/i })
      fireEvent.click(expandButton)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
    })

    it('should toggle state on multiple clicks', () => {
      render(<EpicCard epic={mockEpic} defaultExpanded={true} />)
      const button = screen.getByRole('button')

      // First click - collapse
      fireEvent.click(button)
      expect(screen.queryByText('Story 1')).not.toBeInTheDocument()

      // Second click - expand
      fireEvent.click(button)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('should show 100% when all stories are done', () => {
      const completedEpic = {
        ...mockEpic,
        stories: [
          { id: 's1', title: 'Story 1', status: 'done' },
          { id: 's2', title: 'Story 2', status: 'done' },
          { id: 's3', title: 'Story 3', status: 'done' },
        ],
      }
      render(<EpicCard epic={completedEpic} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveStyle({ width: '100%' })
    })

    it('should show 0% when no stories are done', () => {
      const notStartedEpic = {
        ...mockEpic,
        stories: [
          { id: 's1', title: 'Story 1', status: 'idea' },
          { id: 's2', title: 'Story 2', status: 'idea' },
        ],
      }
      render(<EpicCard epic={notStartedEpic} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should handle empty stories array', () => {
      const emptyEpic = { ...mockEpic, stories: [] }
      render(<EpicCard epic={emptyEpic} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })
  })

  describe('Story Count Badge', () => {
    it('should show correct count for 1 story', () => {
      const singleStoryEpic = {
        ...mockEpic,
        stories: [{ id: 's1', title: 'Story 1', status: 'done' }],
      }
      render(<EpicCard epic={singleStoryEpic} />)
      expect(screen.getByText('1 story')).toBeInTheDocument()
    })

    it('should show plural "stories" for multiple stories', () => {
      render(<EpicCard epic={mockEpic} />)
      expect(screen.getByText('3 stories')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<EpicCard epic={mockEpic} />)
      const card = screen.getByRole('region', { name: /test epic/i })
      expect(card).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<EpicCard epic={mockEpic} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('tabIndex', '0')
    })
  })
})
