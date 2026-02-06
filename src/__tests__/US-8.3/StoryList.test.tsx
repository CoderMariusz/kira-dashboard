import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryList } from '@/components/epics/StoryList'

// Mock Framer Motion for tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('StoryList Component', () => {
  const mockStories = [
    { id: 's1', title: 'Story 1', description: 'Description 1', status: 'idea' },
    { id: 's2', title: 'Story 2', description: 'Description 2', status: 'in_progress' },
    { id: 's3', title: 'Story 3', description: 'Description 3', status: 'done' },
  ]

  describe('Rendering Stories', () => {
    it('should render all stories', () => {
      render(<StoryList stories={mockStories} />)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
      expect(screen.getByText('Story 2')).toBeInTheDocument()
      expect(screen.getByText('Story 3')).toBeInTheDocument()
    })

    it('should render empty state when no stories', () => {
      render(<StoryList stories={[]} />)
      expect(screen.getByText(/no stories|empty/i)).toBeInTheDocument()
    })

    it('should render each story as a mini-card', () => {
      render(<StoryList stories={mockStories} />)
      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(3)
    })

    it('should display story title', () => {
      render(<StoryList stories={mockStories} />)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
    })

    it('should display story description if provided', () => {
      render(<StoryList stories={mockStories} />)
      expect(screen.getByText('Description 1')).toBeInTheDocument()
    })
  })

  describe('Status Indicators', () => {
    it('should show idea status indicator', () => {
      const ideaStories = [{ id: 's1', title: 'Story 1', status: 'idea' }]
      render(<StoryList stories={ideaStories} />)
      const indicator = screen.getByTestId('status-indicator-s1')
      expect(indicator).toHaveClass('status-idea')
    })

    it('should show in_progress status indicator', () => {
      const progressStories = [{ id: 's1', title: 'Story 1', status: 'in_progress' }]
      render(<StoryList stories={progressStories} />)
      const indicator = screen.getByTestId('status-indicator-s1')
      expect(indicator).toHaveClass('status-in-progress')
    })

    it('should show done status indicator', () => {
      const doneStories = [{ id: 's1', title: 'Story 1', status: 'done' }]
      render(<StoryList stories={doneStories} />)
      const indicator = screen.getByTestId('status-indicator-s1')
      expect(indicator).toHaveClass('status-done')
    })

    it('should display status label', () => {
      const ideaStories = [{ id: 's1', title: 'Story 1', status: 'idea' }]
      render(<StoryList stories={ideaStories} />)
      expect(screen.getByText('Idea')).toBeInTheDocument()
    })

    it('should color-code status indicators', () => {
      render(<StoryList stories={mockStories} />)

      const ideaIndicator = screen.getByTestId('status-indicator-s1')
      const progressIndicator = screen.getByTestId('status-indicator-s2')
      const doneIndicator = screen.getByTestId('status-indicator-s3')

      expect(ideaIndicator).toHaveStyle({ backgroundColor: expect.any(String) })
      expect(progressIndicator).toHaveStyle({ backgroundColor: expect.any(String) })
      expect(doneIndicator).toHaveStyle({ backgroundColor: expect.any(String) })
    })
  })

  describe('Story Interaction', () => {
    it('should call onStoryClick when story is clicked', () => {
      const handleClick = vi.fn()
      render(<StoryList stories={mockStories} onStoryClick={handleClick} />)

      const storyCard = screen.getByText('Story 1').closest('[data-testid^="story-card-"]')
      if (storyCard) {
        fireEvent.click(storyCard)
      }
      expect(handleClick).toHaveBeenCalledWith(mockStories[0])
    })

    it('should open detail modal on story click', () => {
      render(<StoryList stories={mockStories} />)

      const storyCard = screen.getByText('Story 1').closest('[data-testid^="story-card-"]')
      if (storyCard) {
        fireEvent.click(storyCard)
      }

      // Modal should appear
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter stories by status', () => {
      render(<StoryList stories={mockStories} filterStatus="done" />)
      expect(screen.getByText('Story 3')).toBeInTheDocument()
      expect(screen.queryByText('Story 1')).not.toBeInTheDocument()
    })

    it('should show all stories when no filter applied', () => {
      render(<StoryList stories={mockStories} />)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
      expect(screen.getByText('Story 2')).toBeInTheDocument()
      expect(screen.getByText('Story 3')).toBeInTheDocument()
    })

    it('should sort stories by status', () => {
      render(<StoryList stories={mockStories} sortBy="status" />)
      const stories = screen.getAllByRole('article')
      expect(stories[0]).toHaveTextContent('Story 1') // idea
      expect(stories[1]).toHaveTextContent('Story 2') // in_progress
      expect(stories[2]).toHaveTextContent('Story 3') // done
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for stories', () => {
      render(<StoryList stories={mockStories} />)
      const stories = screen.getAllByRole('article')
      expect(stories[0]).toHaveAttribute('aria-label', 'Story 1')
    })

    it('should be keyboard navigable', () => {
      render(<StoryList stories={mockStories} />)
      const stories = screen.getAllByRole('article')
      stories.forEach(story => {
        expect(story).toHaveAttribute('tabIndex', '0')
      })
    })

    it('should announce status changes to screen readers', () => {
      render(<StoryList stories={mockStories} />)
      const statusIndicator = screen.getByTestId('status-indicator-s1')
      expect(statusIndicator).toHaveAttribute('aria-label', 'Status: Idea')
    })
  })

  describe('Drag and Drop (nice-to-have)', () => {
    it('should render draggable stories', () => {
      render(<StoryList stories={mockStories} draggable={true} />)
      const stories = screen.getAllByRole('article')
      stories.forEach(story => {
        expect(story).toHaveAttribute('draggable', 'true')
      })
    })

    it('should call onDragStart when story drag begins', () => {
      const handleDragStart = vi.fn()
      render(
        <StoryList
          stories={mockStories}
          draggable={true}
          onDragStart={handleDragStart}
        />
      )

      const storyCard = screen.getByText('Story 1').closest('[data-testid^="story-card-"]')
      if (storyCard) {
        fireEvent.dragStart(storyCard)
      }
      expect(handleDragStart).toHaveBeenCalled()
    })

    it('should call onDrop when story is dropped', () => {
      const handleDrop = vi.fn()
      render(
        <StoryList
          stories={mockStories}
          draggable={true}
          onDrop={handleDrop}
        />
      )

      const storyCard = screen.getByText('Story 1').closest('[data-testid^="story-card-"]')
      if (storyCard) {
        fireEvent.drop(storyCard)
      }
      expect(handleDrop).toHaveBeenCalled()
    })
  })
})
