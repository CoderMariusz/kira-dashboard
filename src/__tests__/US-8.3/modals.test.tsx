import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateEpicModal } from '@/components/epics/CreateEpicModal'
import { AddStoryModal } from '@/components/epics/AddStoryModal'

// Mock Framer Motion for tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    dialog: ({ children, ...props }: any) => <dialog {...props}>{children}</dialog>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('CreateEpicModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateEpic: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<CreateEpicModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      render(<CreateEpicModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render title input field', () => {
      render(<CreateEpicModal {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toBeInTheDocument()
      expect(titleInput).toHaveAttribute('type', 'text')
    })

    it('should render description textarea', () => {
      render(<CreateEpicModal {...defaultProps} />)
      const descInput = screen.getByLabelText(/description/i)
      expect(descInput).toBeInTheDocument()
      expect(descInput.tagName).toBe('TEXTAREA')
    })

    it('should render Create button', () => {
      render(<CreateEpicModal {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create/i })
      expect(createButton).toBeInTheDocument()
    })

    it('should render Cancel button', () => {
      render(<CreateEpicModal {...defaultProps} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should display modal title', () => {
      render(<CreateEpicModal {...defaultProps} />)
      expect(screen.getByText(/create epic|new epic/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when title is empty on submit', async () => {
      render(<CreateEpicModal {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/title is required|please enter a title/i)).toBeInTheDocument()
      })
    })

    it('should show error when title is too short', async () => {
      render(<CreateEpicModal {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      const createButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'AB' } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/title must be at least|too short/i)).toBeInTheDocument()
      })
    })

    it('should show error when title exceeds max length', async () => {
      render(<CreateEpicModal {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      const createButton = screen.getByRole('button', { name: /create/i })

      const longTitle = 'A'.repeat(101)
      fireEvent.change(titleInput, { target: { value: longTitle } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/title is too long|maximum/i)).toBeInTheDocument()
      })
    })

    it('should not show error when title is valid', async () => {
      render(<CreateEpicModal {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      const createButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'Valid Epic Title' } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
      })
    })

    it('should clear errors on input change', async () => {
      render(<CreateEpicModal {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create/i })
      const titleInput = screen.getByLabelText(/title/i)

      // Trigger error
      fireEvent.click(createButton)
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })

      // Clear error
      fireEvent.change(titleInput, { target: { value: 'New Title' } })
      expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call onCreateEpic with valid data', async () => {
      const onCreateEpic = vi.fn()
      render(<CreateEpicModal {...defaultProps} onCreateEpic={onCreateEpic} />)

      const titleInput = screen.getByLabelText(/title/i)
      const descInput = screen.getByLabelText(/description/i)
      const createButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'Test Epic' } })
      fireEvent.change(descInput, { target: { value: 'Test Description' } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(onCreateEpic).toHaveBeenCalledWith({
          title: 'Test Epic',
          description: 'Test Description',
        })
      })
    })

    it('should call onCreateEpic without description', async () => {
      const onCreateEpic = vi.fn()
      render(<CreateEpicModal {...defaultProps} onCreateEpic={onCreateEpic} />)

      const titleInput = screen.getByLabelText(/title/i)
      const createButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'Test Epic' } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(onCreateEpic).toHaveBeenCalledWith({
          title: 'Test Epic',
          description: '',
        })
      })
    })

    it('should not call onCreateEpic when form is invalid', async () => {
      const onCreateEpic = vi.fn()
      render(<CreateEpicModal {...defaultProps} onCreateEpic={onCreateEpic} />)

      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(onCreateEpic).not.toHaveBeenCalled()
      })
    })

    it('should close modal after successful creation', async () => {
      const onClose = vi.fn()
      render(<CreateEpicModal {...defaultProps} onClose={onClose} />)

      const titleInput = screen.getByLabelText(/title/i)
      const createButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'Test Epic' } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('should disable submit button while submitting', async () => {
      const onCreateEpic = vi.fn(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      render(<CreateEpicModal {...defaultProps} onCreateEpic={onCreateEpic} />)

      const titleInput = screen.getByLabelText(/title/i)
      const createButton = screen.getByRole('button', { name: /create/i })

      fireEvent.change(titleInput, { target: { value: 'Test Epic' } })
      fireEvent.click(createButton)

      expect(createButton).toBeDisabled()
      expect(createButton).toHaveTextContent(/creating|saving/i)
    })
  })

  describe('Modal Actions', () => {
    it('should call onClose when Cancel button clicked', () => {
      const onClose = vi.fn()
      render(<CreateEpicModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop clicked', () => {
      const onClose = vi.fn()
      render(<CreateEpicModal {...defaultProps} onClose={onClose} />)

      const backdrop = screen.getByTestId('modal-backdrop')
      fireEvent.click(backdrop)

      expect(onClose).toHaveBeenCalled()
    })

    it('should not call onClose when modal content clicked', () => {
      const onClose = vi.fn()
      render(<CreateEpicModal {...defaultProps} onClose={onClose} />)

      const content = screen.getByTestId('modal-content')
      fireEvent.click(content)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should close on Escape key press', () => {
      const onClose = vi.fn()
      render(<CreateEpicModal {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should trap focus within modal', () => {
      render(<CreateEpicModal {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toHaveFocus()
    })

    it('should have proper ARIA attributes', () => {
      render(<CreateEpicModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('should have proper labels for form fields', () => {
      render(<CreateEpicModal {...defaultProps} />)
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })
})

describe('AddStoryModal Component', () => {
  const mockEpics = [
    { id: '1', title: 'Epic 1', description: 'Description 1' },
    { id: '2', title: 'Epic 2', description: 'Description 2' },
  ]

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAddStory: vi.fn(),
    epics: mockEpics,
  }

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<AddStoryModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should render title input field', () => {
      render(<AddStoryModal {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toBeInTheDocument()
      expect(titleInput).toHaveAttribute('type', 'text')
    })

    it('should render acceptance criteria textarea', () => {
      render(<AddStoryModal {...defaultProps} />)
      const acInput = screen.getByLabelText(/acceptance criteria/i)
      expect(acInput).toBeInTheDocument()
      expect(acInput.tagName).toBe('TEXTAREA')
    })

    it('should render epic dropdown', () => {
      render(<AddStoryModal {...defaultProps} />)
      const epicSelect = screen.getByLabelText(/epic/i)
      expect(epicSelect).toBeInTheDocument()
      expect(epicSelect.tagName).toBe('SELECT')
    })

    it('should render Add button', () => {
      render(<AddStoryModal {...defaultProps} />)
      const addButton = screen.getByRole('button', { name: /add/i })
      expect(addButton).toBeInTheDocument()
    })

    it('should render Cancel button', () => {
      render(<AddStoryModal {...defaultProps} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should display modal title', () => {
      render(<AddStoryModal {...defaultProps} />)
      expect(screen.getByText(/add story|new story/i)).toBeInTheDocument()
    })
  })

  describe('Epic Selection', () => {
    it('should render all epics in dropdown', () => {
      render(<AddStoryModal {...defaultProps} />)
      const epicSelect = screen.getByLabelText(/epic/i) as HTMLSelectElement

      expect(epicSelect.options.length).toBe(2)
      expect(epicSelect.options[0].text).toBe('Epic 1')
      expect(epicSelect.options[1].text).toBe('Epic 2')
    })

    it('should pre-select epic when defaultEpicId is provided', () => {
      render(<AddStoryModal {...defaultProps} defaultEpicId="1" />)
      const epicSelect = screen.getByLabelText(/epic/i) as HTMLSelectElement
      expect(epicSelect.value).toBe('1')
    })

    it('should have no selection when defaultEpicId is not provided', () => {
      render(<AddStoryModal {...defaultProps} />)
      const epicSelect = screen.getByLabelText(/epic/i) as HTMLSelectElement
      expect(epicSelect.value).toBe('')
    })

    it('should disable epic dropdown when only one epic exists', () => {
      const singleEpic = [{ id: '1', title: 'Epic 1', description: 'Desc' }]
      render(<AddStoryModal {...defaultProps} epics={singleEpic} defaultEpicId="1" />)
      const epicSelect = screen.getByLabelText(/epic/i) as HTMLSelectElement
      expect(epicSelect).toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    it('should show error when title is empty on submit', async () => {
      render(<AddStoryModal {...defaultProps} />)
      const addButton = screen.getByRole('button', { name: /add/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/title is required|please enter a title/i)).toBeInTheDocument()
      })
    })

    it('should show error when epic is not selected', async () => {
      render(<AddStoryModal {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      const addButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'Story Title' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/please select an epic/i)).toBeInTheDocument()
      })
    })

    it('should not show error when all fields are valid', async () => {
      render(<AddStoryModal {...defaultProps} defaultEpicId="1" />)
      const titleInput = screen.getByLabelText(/title/i)
      const addButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'Story Title' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/please select an epic/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onAddStory with valid data', async () => {
      const onAddStory = vi.fn()
      render(<AddStoryModal {...defaultProps} onAddStory={onAddStory} defaultEpicId="1" />)

      const titleInput = screen.getByLabelText(/title/i)
      const acInput = screen.getByLabelText(/acceptance criteria/i)
      const addButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'Test Story' } })
      fireEvent.change(acInput, { target: { value: 'AC 1\nAC 2\nAC 3' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(onAddStory).toHaveBeenCalledWith({
          title: 'Test Story',
          acceptanceCriteria: ['AC 1', 'AC 2', 'AC 3'],
          epicId: '1',
        })
      })
    })

    it('should parse acceptance criteria by newlines', async () => {
      const onAddStory = vi.fn()
      render(<AddStoryModal {...defaultProps} onAddStory={onAddStory} defaultEpicId="1" />)

      const titleInput = screen.getByLabelText(/title/i)
      const acInput = screen.getByLabelText(/acceptance criteria/i)
      const addButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'Test Story' } })
      fireEvent.change(acInput, { target: { value: 'AC 1\nAC 2' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(onAddStory).toHaveBeenCalledWith({
          title: 'Test Story',
          acceptanceCriteria: ['AC 1', 'AC 2'],
          epicId: '1',
        })
      })
    })

    it('should handle empty acceptance criteria', async () => {
      const onAddStory = vi.fn()
      render(<AddStoryModal {...defaultProps} onAddStory={onAddStory} defaultEpicId="1" />)

      const titleInput = screen.getByLabelText(/title/i)
      const addButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'Test Story' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(onAddStory).toHaveBeenCalledWith({
          title: 'Test Story',
          acceptanceCriteria: [],
          epicId: '1',
        })
      })
    })

    it('should close modal after successful creation', async () => {
      const onClose = vi.fn()
      render(<AddStoryModal {...defaultProps} onClose={onClose} defaultEpicId="1" />)

      const titleInput = screen.getByLabelText(/title/i)
      const addButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'Test Story' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('should disable submit button while submitting', async () => {
      const onAddStory = vi.fn(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      render(<AddStoryModal {...defaultProps} onAddStory={onAddStory} defaultEpicId="1" />)

      const titleInput = screen.getByLabelText(/title/i)
      const addButton = screen.getByRole('button', { name: /add/i })

      fireEvent.change(titleInput, { target: { value: 'Test Story' } })
      fireEvent.click(addButton)

      expect(addButton).toBeDisabled()
      expect(addButton).toHaveTextContent(/adding|saving/i)
    })
  })

  describe('Modal Actions', () => {
    it('should call onClose when Cancel button clicked', () => {
      const onClose = vi.fn()
      render(<AddStoryModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop clicked', () => {
      const onClose = vi.fn()
      render(<AddStoryModal {...defaultProps} onClose={onClose} />)

      const backdrop = screen.getByTestId('modal-backdrop')
      fireEvent.click(backdrop)

      expect(onClose).toHaveBeenCalled()
    })

    it('should close on Escape key press', () => {
      const onClose = vi.fn()
      render(<AddStoryModal {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AddStoryModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('should have proper labels for form fields', () => {
      render(<AddStoryModal {...defaultProps} />)
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/acceptance criteria/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/epic/i)).toBeInTheDocument()
    })
  })
})
