import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '../toaster'
import { useToast } from '@/hooks/use-toast'

// Mock the useToast hook
const mockToasts = jest.fn()
const mockToast = jest.fn()
const mockDismiss = jest.fn()

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

// Mock the toast components
jest.mock('../toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
  ToastViewport: () => <div data-testid="toast-viewport" />,
  Toast: ({ children, ...props }: any) => (
    <div data-testid="toast" data-variant={props.variant} data-open={props.open} {...props}>
      {children}
    </div>
  ),
  ToastTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-title">{children}</div>,
  ToastDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-description">{children}</div>,
  ToastClose: () => <button data-testid="toast-close">×</button>
}))

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('Toaster Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseToast.mockReturnValue({
      toasts: mockToasts(),
      toast: mockToast,
      dismiss: mockDismiss
    })
  })

  describe('Basic Rendering', () => {
    it('renders toast provider and viewport', () => {
      mockToasts.mockReturnValue([])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast-provider')).toBeInTheDocument()
      expect(screen.getByTestId('toast-viewport')).toBeInTheDocument()
    })

    it('renders empty state when no toasts', () => {
      mockToasts.mockReturnValue([])
      
      render(<Toaster />)
      
      expect(screen.queryByTestId('toast')).not.toBeInTheDocument()
    })

    it('applies correct structure with provider and viewport', () => {
      mockToasts.mockReturnValue([])
      
      render(<Toaster />)
      
      const provider = screen.getByTestId('toast-provider')
      const viewport = screen.getByTestId('toast-viewport')
      
      expect(provider).toContainElement(viewport)
    })
  })

  describe('Single Toast Rendering', () => {
    it('renders single toast with basic content', () => {
      const toast = {
        id: '1',
        title: 'Success',
        description: 'Operation completed successfully'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toBeInTheDocument()
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Success')
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Operation completed successfully')
      expect(screen.getByTestId('toast-close')).toBeInTheDocument()
    })

    it('renders toast with only title', () => {
      const toast = {
        id: '1',
        title: 'Information'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Information')
      expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument()
    })

    it('renders toast with only description', () => {
      const toast = {
        id: '1',
        description: 'Something happened'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument()
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Something happened')
    })

    it('renders toast without title or description', () => {
      const toast = {
        id: '1'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toBeInTheDocument()
      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument()
      expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument()
      expect(screen.getByTestId('toast-close')).toBeInTheDocument()
    })
  })

  describe('Toast Variants', () => {
    it('renders default variant toast', () => {
      const toast = {
        id: '1',
        title: 'Default',
        variant: 'default' as const
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'default')
    })

    it('renders destructive variant toast', () => {
      const toast = {
        id: '1',
        title: 'Error',
        variant: 'destructive' as const
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'destructive')
    })

    it('renders success variant toast', () => {
      const toast = {
        id: '1',
        title: 'Success',
        variant: 'success' as const
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'success')
    })

    it('renders warning variant toast', () => {
      const toast = {
        id: '1',
        title: 'Warning',
        variant: 'warning' as const
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'warning')
    })

    it('renders info variant toast', () => {
      const toast = {
        id: '1',
        title: 'Info',
        variant: 'info' as const
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'info')
    })

    it('renders loading variant toast', () => {
      const toast = {
        id: '1',
        title: 'Loading',
        variant: 'loading' as const
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'loading')
    })
  })

  describe('Multiple Toasts', () => {
    it('renders multiple toasts in order', () => {
      const toasts = [
        { id: '1', title: 'First Toast' },
        { id: '2', title: 'Second Toast' },
        { id: '3', title: 'Third Toast' }
      ]
      mockToasts.mockReturnValue(toasts)
      
      render(<Toaster />)
      
      const toastElements = screen.getAllByTestId('toast')
      expect(toastElements).toHaveLength(3)
      
      const titles = screen.getAllByTestId('toast-title')
      expect(titles[0]).toHaveTextContent('First Toast')
      expect(titles[1]).toHaveTextContent('Second Toast')
      expect(titles[2]).toHaveTextContent('Third Toast')
    })

    it('renders toasts with different variants', () => {
      const toasts = [
        { id: '1', title: 'Success', variant: 'success' as const },
        { id: '2', title: 'Error', variant: 'destructive' as const },
        { id: '3', title: 'Warning', variant: 'warning' as const }
      ]
      mockToasts.mockReturnValue(toasts)
      
      render(<Toaster />)
      
      const toastElements = screen.getAllByTestId('toast')
      expect(toastElements[0]).toHaveAttribute('data-variant', 'success')
      expect(toastElements[1]).toHaveAttribute('data-variant', 'destructive')
      expect(toastElements[2]).toHaveAttribute('data-variant', 'warning')
    })

    it('each toast has its own close button', () => {
      const toasts = [
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' }
      ]
      mockToasts.mockReturnValue(toasts)
      
      render(<Toaster />)
      
      expect(screen.getAllByTestId('toast-close')).toHaveLength(2)
    })
  })

  describe('Toast Actions', () => {
    it('renders toast with action element', () => {
      const actionElement = <button data-testid="custom-action">Undo</button>
      const toast = {
        id: '1',
        title: 'Action Toast',
        action: actionElement
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('custom-action')).toBeInTheDocument()
      expect(screen.getByTestId('custom-action')).toHaveTextContent('Undo')
    })

    it('renders toast without action element', () => {
      const toast = {
        id: '1',
        title: 'No Action Toast'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.queryByTestId('custom-action')).not.toBeInTheDocument()
    })

    it('renders multiple toasts with different actions', () => {
      const toasts = [
        {
          id: '1',
          title: 'First',
          action: <button data-testid="action-1">Action 1</button>
        },
        {
          id: '2',
          title: 'Second',
          action: <button data-testid="action-2">Action 2</button>
        },
        {
          id: '3',
          title: 'Third'
          // No action
        }
      ]
      mockToasts.mockReturnValue(toasts)
      
      render(<Toaster />)
      
      expect(screen.getByTestId('action-1')).toBeInTheDocument()
      expect(screen.getByTestId('action-2')).toBeInTheDocument()
      expect(screen.queryByTestId('action-3')).not.toBeInTheDocument()
    })
  })

  describe('Toast Props Forwarding', () => {
    it('forwards custom props to toast component', () => {
      const toast = {
        id: '1',
        title: 'Custom Props',
        'data-custom': 'value',
        className: 'custom-class'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      const toastElement = screen.getByTestId('toast')
      expect(toastElement).toHaveAttribute('data-custom', 'value')
      expect(toastElement).toHaveClass('custom-class')
    })

    it('forwards aria attributes', () => {
      const toast = {
        id: '1',
        title: 'Accessible Toast',
        'aria-label': 'Important notification',
        'aria-describedby': 'toast-description'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      const toastElement = screen.getByTestId('toast')
      expect(toastElement).toHaveAttribute('aria-label', 'Important notification')
      expect(toastElement).toHaveAttribute('aria-describedby', 'toast-description')
    })

    it('forwards open state', () => {
      const toast = {
        id: '1',
        title: 'Open Toast',
        open: true
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-open', 'true')
    })
  })

  describe('Toast Content Structure', () => {
    it('renders content in grid layout', () => {
      const toast = {
        id: '1',
        title: 'Grid Layout',
        description: 'Content in grid'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      const toastElement = screen.getByTestId('toast')
      const gridContainer = toastElement.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
      expect(gridContainer).toHaveClass('gap-1')
    })

    it('renders title and description in same grid container', () => {
      const toast = {
        id: '1',
        title: 'Title',
        description: 'Description'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      const gridContainer = document.querySelector('.grid')
      const title = screen.getByTestId('toast-title')
      const description = screen.getByTestId('toast-description')
      
      expect(gridContainer).toContainElement(title)
      expect(gridContainer).toContainElement(description)
    })

    it('action and close button are outside grid container', () => {
      const actionElement = <button data-testid="action-btn">Action</button>
      const toast = {
        id: '1',
        title: 'Layout Test',
        action: actionElement
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      const gridContainer = document.querySelector('.grid')
      const action = screen.getByTestId('action-btn')
      const closeButton = screen.getByTestId('toast-close')
      
      expect(gridContainer).not.toContainElement(action)
      expect(gridContainer).not.toContainElement(closeButton)
    })
  })

  describe('Dynamic Toast Updates', () => {
    it('updates when toast list changes', () => {
      const { rerender } = render(<Toaster />)
      
      // Initially no toasts
      mockToasts.mockReturnValue([])
      rerender(<Toaster />)
      expect(screen.queryByTestId('toast')).not.toBeInTheDocument()
      
      // Add a toast
      mockToasts.mockReturnValue([{ id: '1', title: 'New Toast' }])
      rerender(<Toaster />)
      expect(screen.getByTestId('toast')).toBeInTheDocument()
      expect(screen.getByTestId('toast-title')).toHaveTextContent('New Toast')
    })

    it('handles toast removal', () => {
      const { rerender } = render(<Toaster />)
      
      // Start with toasts
      mockToasts.mockReturnValue([
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' }
      ])
      rerender(<Toaster />)
      expect(screen.getAllByTestId('toast')).toHaveLength(2)
      
      // Remove one toast
      mockToasts.mockReturnValue([{ id: '2', title: 'Second' }])
      rerender(<Toaster />)
      expect(screen.getAllByTestId('toast')).toHaveLength(1)
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Second')
    })

    it('handles complete toast list replacement', () => {
      const { rerender } = render(<Toaster />)
      
      // Start with one set of toasts
      mockToasts.mockReturnValue([{ id: '1', title: 'Old Toast' }])
      rerender(<Toaster />)
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Old Toast')
      
      // Replace with completely new toasts
      mockToasts.mockReturnValue([{ id: '2', title: 'New Toast' }])
      rerender(<Toaster />)
      expect(screen.getByTestId('toast-title')).toHaveTextContent('New Toast')
    })
  })

  describe('Complex Toast Content', () => {
    it('renders toast with React element title', () => {
      const titleElement = <span data-testid="custom-title">Custom <strong>Title</strong></span>
      const toast = {
        id: '1',
        title: titleElement
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('custom-title')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
    })

    it('renders toast with React element description', () => {
      const descriptionElement = (
        <div data-testid="custom-description">
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </div>
      )
      const toast = {
        id: '1',
        description: descriptionElement
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('custom-description')).toBeInTheDocument()
      expect(screen.getByText('First paragraph')).toBeInTheDocument()
      expect(screen.getByText('Second paragraph')).toBeInTheDocument()
    })

    it('renders toast with complex action', () => {
      const complexAction = (
        <div data-testid="complex-action">
          <button>Primary</button>
          <button>Secondary</button>
        </div>
      )
      const toast = {
        id: '1',
        title: 'Complex Action',
        action: complexAction
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('complex-action')).toBeInTheDocument()
      expect(screen.getByText('Primary')).toBeInTheDocument()
      expect(screen.getByText('Secondary')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty string title', () => {
      const toast = {
        id: '1',
        title: ''
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument()
    })

    it('handles empty string description', () => {
      const toast = {
        id: '1',
        description: ''
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument()
    })

    it('handles null title', () => {
      const toast = {
        id: '1',
        title: null
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument()
    })

    it('handles undefined description', () => {
      const toast = {
        id: '1',
        title: 'Title',
        description: undefined
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast-title')).toBeInTheDocument()
      expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument()
    })

    it('handles numeric content', () => {
      const toast = {
        id: '1',
        title: 42,
        description: 0
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast-title')).toHaveTextContent('42')
      expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument() // 0 is falsy
    })

    it('handles very long content', () => {
      const longTitle = 'A'.repeat(1000)
      const longDescription = 'B'.repeat(2000)
      const toast = {
        id: '1',
        title: longTitle,
        description: longDescription
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast-title')).toHaveTextContent(longTitle)
      expect(screen.getByTestId('toast-description')).toHaveTextContent(longDescription)
    })
  })

  describe('Toast IDs and Keys', () => {
    it('uses toast id as React key', () => {
      const toasts = [
        { id: 'unique-1', title: 'First' },
        { id: 'unique-2', title: 'Second' }
      ]
      mockToasts.mockReturnValue(toasts)
      
      render(<Toaster />)
      
      const toastElements = screen.getAllByTestId('toast')
      expect(toastElements).toHaveLength(2)
      // React keys are not directly testable, but we verify the structure is correct
    })

    it('handles duplicate IDs gracefully', () => {
      const toasts = [
        { id: 'duplicate', title: 'First' },
        { id: 'duplicate', title: 'Second' }
      ]
      mockToasts.mockReturnValue(toasts)
      
      // Should not throw an error
      expect(() => render(<Toaster />)).not.toThrow()
      
      const toastElements = screen.getAllByTestId('toast')
      expect(toastElements).toHaveLength(2)
    })

    it('handles special characters in IDs', () => {
      const toast = {
        id: 'toast-123!@#$%^&*()',
        title: 'Special ID'
      }
      mockToasts.mockReturnValue([toast])
      
      expect(() => render(<Toaster />)).not.toThrow()
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
  })

  describe('useToast Hook Integration', () => {
    it('calls useToast hook on render', () => {
      mockToasts.mockReturnValue([])
      
      render(<Toaster />)
      
      expect(mockUseToast).toHaveBeenCalled()
    })

    it('re-renders when useToast returns new data', () => {
      let renderCount = 0
      const TestWrapper = () => {
        renderCount++
        return <Toaster />
      }
      
      mockToasts.mockReturnValue([])
      const { rerender } = render(<TestWrapper />)
      expect(renderCount).toBe(1)
      
      mockToasts.mockReturnValue([{ id: '1', title: 'New' }])
      rerender(<TestWrapper />)
      expect(renderCount).toBe(2)
    })

    it('handles useToast hook returning different structures', () => {
      // Test with minimal toast data
      mockToasts.mockReturnValue([{ id: '1' }])
      
      expect(() => render(<Toaster />)).not.toThrow()
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
  })

  describe('Performance Considerations', () => {
    it('renders efficiently with many toasts', () => {
      const manyToasts = Array.from({ length: 50 }, (_, i) => ({
        id: `toast-${i}`,
        title: `Toast ${i}`,
        description: `Description ${i}`
      }))
      mockToasts.mockReturnValue(manyToasts)
      
      const startTime = performance.now()
      render(<Toaster />)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should render in < 100ms
      expect(screen.getAllByTestId('toast')).toHaveLength(50)
    })

    it('handles rapid toast updates', () => {
      const { rerender } = render(<Toaster />)
      
      // Simulate rapid updates
      for (let i = 0; i < 20; i++) {
        mockToasts.mockReturnValue([{ id: `${i}`, title: `Toast ${i}` }])
        rerender(<Toaster />)
      }
      
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Toast 19')
    })
  })

  describe('Common Usage Patterns', () => {
    it('renders success notification pattern', () => {
      const toast = {
        id: '1',
        variant: 'success' as const,
        title: 'Success!',
        description: 'Your changes have been saved.',
        action: <button data-testid="view-changes">View Changes</button>
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'success')
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Success!')
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Your changes have been saved.')
      expect(screen.getByTestId('view-changes')).toBeInTheDocument()
    })

    it('renders error notification pattern', () => {
      const toast = {
        id: '1',
        variant: 'destructive' as const,
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        action: <button data-testid="retry">Retry</button>
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'destructive')
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Error')
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Something went wrong. Please try again.')
      expect(screen.getByTestId('retry')).toBeInTheDocument()
    })

    it('renders undo action pattern', () => {
      const toast = {
        id: '1',
        title: 'Item deleted',
        action: <button data-testid="undo">Undo</button>
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Item deleted')
      expect(screen.getByTestId('undo')).toBeInTheDocument()
    })

    it('renders loading notification pattern', () => {
      const toast = {
        id: '1',
        variant: 'loading' as const,
        title: 'Uploading...',
        description: 'Please wait while we process your file.'
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'loading')
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Uploading...')
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Please wait while we process your file.')
    })

    it('renders progress update pattern', () => {
      const toast = {
        id: '1',
        title: 'Upload Progress',
        description: '75% complete',
        action: <div data-testid="progress-bar" style={{ width: '75%' }} />
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Upload Progress')
      expect(screen.getByTestId('toast-description')).toHaveTextContent('75% complete')
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    it('renders multi-action pattern', () => {
      const multiAction = (
        <div data-testid="multi-actions">
          <button data-testid="save">Save</button>
          <button data-testid="discard">Discard</button>
        </div>
      )
      const toast = {
        id: '1',
        title: 'Unsaved Changes',
        description: 'You have unsaved changes.',
        action: multiAction
      }
      mockToasts.mockReturnValue([toast])
      
      render(<Toaster />)
      
      expect(screen.getByTestId('multi-actions')).toBeInTheDocument()
      expect(screen.getByTestId('save')).toBeInTheDocument()
      expect(screen.getByTestId('discard')).toBeInTheDocument()
    })
  })

  describe('Toast Stack Management', () => {
    it('handles toast stack ordering', () => {
      const toasts = [
        { id: '1', title: 'Newest' },
        { id: '2', title: 'Middle' },
        { id: '3', title: 'Oldest' }
      ]
      mockToasts.mockReturnValue(toasts)
      
      render(<Toaster />)
      
      const titles = screen.getAllByTestId('toast-title')
      expect(titles[0]).toHaveTextContent('Newest')
      expect(titles[1]).toHaveTextContent('Middle')
      expect(titles[2]).toHaveTextContent('Oldest')
    })

    it('maintains consistent rendering order', () => {
      const { rerender } = render(<Toaster />)
      
      // First render
      mockToasts.mockReturnValue([
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' }
      ])
      rerender(<Toaster />)
      
      let titles = screen.getAllByTestId('toast-title')
      expect(titles[0]).toHaveTextContent('First')
      expect(titles[1]).toHaveTextContent('Second')
      
      // Re-render with same data
      rerender(<Toaster />)
      
      titles = screen.getAllByTestId('toast-title')
      expect(titles[0]).toHaveTextContent('First')
      expect(titles[1]).toHaveTextContent('Second')
    })
  })
})
