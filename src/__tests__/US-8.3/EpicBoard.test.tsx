import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EpicBoard } from '@/components/epics/EpicBoard'

// Mock Framer Motion for tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('EpicBoard Component', () => {
  const mockEpics = [
    {
      id: '1',
      title: 'Epic 1',
      description: 'Description 1',
      stories: [
        { id: 's1', title: 'Story 1', status: 'idea' },
        { id: 's2', title: 'Story 2', status: 'done' },
      ],
    },
    {
      id: '2',
      title: 'Epic 2',
      description: 'Description 2',
      stories: [
        { id: 's3', title: 'Story 3', status: 'in_progress' },
      ],
    },
  ]

  const mockStandaloneTasks = [
    { id: 't1', title: 'Task 1', status: 'idea', epicId: null },
    { id: 't2', title: 'Task 2', status: 'done', epicId: null },
  ]

  describe('Rendering', () => {
    it('should render epic sections', () => {
      render(<EpicBoard epics={mockEpics} />)
      expect(screen.getByText('Epic 1')).toBeInTheDocument()
      expect(screen.getByText('Epic 2')).toBeInTheDocument()
    })

    it('should render stories under epics', () => {
      render(<EpicBoard epics={mockEpics} />)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
      expect(screen.getByText('Story 2')).toBeInTheDocument()
      expect(screen.getByText('Story 3')).toBeInTheDocument()
    })

    it('should render standalone tasks', () => {
      render(<EpicBoard epics={mockEpics} standaloneTasks={mockStandaloneTasks} />)
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
    })

    it('should render "New Epic" button', () => {
      render(<EpicBoard epics={mockEpics} />)
      const button = screen.getByRole('button', { name: /new epic/i })
      expect(button).toBeInTheDocument()
    })

    it('should render "Add Story" buttons on EpicCards', () => {
      render(<EpicBoard epics={mockEpics} />)
      const addButtons = screen.getAllByRole('button', { name: /add story/i })
      expect(addButtons).toHaveLength(2)
    })
  })

  describe('Group by Epic Toggle', () => {
    it('should render group toggle button', () => {
      render(<EpicBoard epics={mockEpics} />)
      const toggle = screen.getByRole('button', { name: /group by epic/i })
      expect(toggle).toBeInTheDocument()
    })

    it('should display "Group by Epic" text when in flat view', () => {
      render(<EpicBoard epics={mockEpics} groupByEpic={false} />)
      expect(screen.getByText('Group by Epic')).toBeInTheDocument()
    })

    it('should display "Flat View" text when grouped by epic', () => {
      render(<EpicBoard epics={mockEpics} groupByEpic={true} />)
      expect(screen.getByText('Flat View')).toBeInTheDocument()
    })

    it('should toggle to grouped view when button clicked', () => {
      const onToggleGroup = vi.fn()
      render(
        <EpicBoard
          epics={mockEpics}
          groupByEpic={false}
          onToggleGroup={onToggleGroup}
        />
      )
      const toggle = screen.getByRole('button', { name: /group by epic/i })
      fireEvent.click(toggle)
      expect(onToggleGroup).toHaveBeenCalledWith(true)
    })

    it('should toggle to flat view when button clicked', () => {
      const onToggleGroup = vi.fn()
      render(
        <EpicBoard
          epics={mockEpics}
          groupByEpic={true}
          onToggleGroup={onToggleGroup}
        />
      )
      const toggle = screen.getByRole('button', { name: /flat view/i })
      fireEvent.click(toggle)
      expect(onToggleGroup).toHaveBeenCalledWith(false)
    })

    it('should group stories under epics when groupByEpic is true', () => {
      render(<EpicBoard epics={mockEpics} groupByEpic={true} />)

      // Stories should be under epic headers
      const epic1 = screen.getByText('Epic 1').closest('[data-testid^="epic-"]')
      expect(epic1).toContainElement(screen.getByText('Story 1'))
    })

    it('should show flat list when groupByEpic is false', () => {
      render(<EpicBoard epics={mockEpics} groupByEpic={false} />)

      // All stories should be visible without epic grouping
      expect(screen.getByText('Story 1')).toBeInTheDocument()
      expect(screen.getByText('Story 2')).toBeInTheDocument()
      expect(screen.getByText('Story 3')).toBeInTheDocument()
    })
  })

  describe('Standalone Tasks', () => {
    it('should display standalone tasks separately from epics', () => {
      render(
        <EpicBoard
          epics={mockEpics}
          standaloneTasks={mockStandaloneTasks}
          groupByEpic={true}
        />
      )

      // Tasks should not be under any epic
      const standaloneSection = screen.getByTestId('standalone-section')
      expect(standaloneSection).toContainElement(screen.getByText('Task 1'))
    })

    it('should hide standalone tasks in epic view', () => {
      render(
        <EpicBoard
          epics={mockEpics}
          standaloneTasks={mockStandaloneTasks}
          groupByEpic={false}
          showStandaloneInFlat={false}
        />
      )

      expect(screen.queryByText('Task 1')).not.toBeInTheDocument()
    })

    it('should show standalone tasks in flat view', () => {
      render(
        <EpicBoard
          epics={mockEpics}
          standaloneTasks={mockStandaloneTasks}
          groupByEpic={false}
          showStandaloneInFlat={true}
        />
      )

      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
  })

  describe('Create Epic Flow', () => {
    it('should open CreateEpicModal when "New Epic" button clicked', () => {
      render(<EpicBoard epics={mockEpics} />)
      const button = screen.getByRole('button', { name: /new epic/i })
      fireEvent.click(button)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should call onCreateEpic when epic is created', () => {
      const onCreateEpic = vi.fn()
      render(<EpicBoard epics={mockEpics} onCreateEpic={onCreateEpic} />)

      // Open modal
      const button = screen.getByRole('button', { name: /new epic/i })
      fireEvent.click(button)

      // Fill form
      const titleInput = screen.getByLabelText(/title/i)
      const descInput = screen.getByLabelText(/description/i)
      const submitButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'New Epic' } })
      fireEvent.change(descInput, { target: { value: 'New Description' } })
      fireEvent.click(submitButton)

      expect(onCreateEpic).toHaveBeenCalledWith({
        title: 'New Epic',
        description: 'New Description',
      })
    })

    it('should add new epic to board after creation', () => {
      const { rerender } = render(<EpicBoard epics={mockEpics} />)

      // Open and submit modal
      const button = screen.getByRole('button', { name: /new epic/i })
      fireEvent.click(button)

      const titleInput = screen.getByLabelText(/title/i)
      const submitButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'New Epic' } })
      fireEvent.click(submitButton)

      // Rerender with new epic
      const updatedEpics = [...mockEpics, {
        id: '3',
        title: 'New Epic',
        description: 'New Description',
        stories: [],
      }]

      rerender(<EpicBoard epics={updatedEpics} />)

      expect(screen.getByText('New Epic')).toBeInTheDocument()
    })
  })

  describe('Add Story Flow', () => {
    it('should open AddStoryModal when "Add Story" button clicked', () => {
      render(<EpicBoard epics={mockEpics} />)
      const addButton = screen.getAllByRole('button', { name: /add story/i })[0]
      fireEvent.click(addButton)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should pre-select epic when adding from EpicCard', () => {
      render(<EpicBoard epics={mockEpics} />)
      const addButton = screen.getAllByRole('button', { name: /add story/i })[0]
      fireEvent.click(addButton)

      const epicSelect = screen.getByLabelText(/epic/i)
      expect(epicSelect).toHaveValue('1')
    })

    it('should show epic dropdown when adding from flat view', () => {
      render(<EpicBoard epics={mockEpics} groupByEpic={false} />)

      // Find "Add Story" button in toolbar
      const addButton = screen.getByRole('button', { name: /add story/i })
      fireEvent.click(addButton)

      // Epic dropdown should be present
      expect(screen.getByLabelText(/epic/i)).toBeInTheDocument()
    })

    it('should call onAddStory when story is created', () => {
      const onAddStory = vi.fn()
      render(<EpicBoard epics={mockEpics} onAddStory={onAddStory} />)

      // Open modal
      const addButton = screen.getAllByRole('button', { name: /add story/i })[0]
      fireEvent.click(addButton)

      // Fill form
      const titleInput = screen.getByLabelText(/title/i)
      const acInput = screen.getByLabelText(/acceptance criteria/i)
      const submitButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'New Story' } })
      fireEvent.change(acInput, { target: { value: 'AC 1\nAC 2' } })
      fireEvent.click(submitButton)

      expect(onAddStory).toHaveBeenCalledWith({
        title: 'New Story',
        acceptanceCriteria: ['AC 1', 'AC 2'],
        epicId: '1',
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('should render sidebar with epics on desktop', () => {
      render(<EpicBoard epics={mockEpics} />)
      const sidebar = screen.getByTestId('epic-sidebar')
      expect(sidebar).toBeInTheDocument()
      expect(sidebar).toHaveClass('desktop-sidebar')
    })

    it('should render accordion-style on mobile', () => {
      render(<EpicBoard epics={mockEpics} viewport="mobile" />)
      const board = screen.getByTestId('epic-board')
      expect(board).toHaveClass('mobile-accordion')
    })

    it('should expand epic on tap in mobile view', () => {
      render(<EpicBoard epics={mockEpics} viewport="mobile" />)
      const epicHeader = screen.getByText('Epic 1')
      fireEvent.click(epicHeader)
      expect(screen.getByText('Story 1')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading indicator when loading', () => {
      render(<EpicBoard epics={mockEpics} isLoading={true} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should not show content when loading', () => {
      render(<EpicBoard epics={mockEpics} isLoading={true} />)
      expect(screen.queryByText('Epic 1')).not.toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no epics', () => {
      render(<EpicBoard epics={[]} />)
      expect(screen.getByText(/no epics|create your first epic/i)).toBeInTheDocument()
    })

    it('should show empty state when epics have no stories', () => {
      const emptyEpics = [
        { id: '1', title: 'Empty Epic', description: 'No stories', stories: [] },
      ]
      render(<EpicBoard epics={emptyEpics} />)
      expect(screen.getByText(/no stories/i)).toBeInTheDocument()
    })
  })
})
