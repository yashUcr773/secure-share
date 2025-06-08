import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  Toast, 
  ToastAction, 
  ToastClose, 
  ToastDescription, 
  ToastProvider, 
  ToastTitle, 
  ToastViewport 
} from '../toast'

// Mock Radix UI Toast primitives
jest.mock('@radix-ui/react-toast', () => ({
  Provider: ({ children, ...props }: any) => <div data-testid="toast-provider" {...props}>{children}</div>,
  Viewport: ({ className, ...props }: any) => <div data-testid="toast-viewport" className={className} {...props} />,
  Root: ({ className, ...props }: any) => <div data-testid="toast-root" className={className} {...props} />,
  Action: ({ className, ...props }: any) => <button data-testid="toast-action" className={className} {...props} />,
  Close: ({ className, ...props }: any) => <button data-testid="toast-close" className={className} {...props} />,
  Title: ({ className, ...props }: any) => <h3 data-testid="toast-title" className={className} {...props} />,
  Description: ({ className, ...props }: any) => <p data-testid="toast-description" className={className} {...props} />,
}))

// Mock X icon from lucide-react
jest.mock('lucide-react', () => ({
  X: ({ className, ...props }: any) => (
    <svg data-testid="x-icon" className={className} {...props}>
      <path d="m18 6-12 12M6 6l12 12" />
    </svg>
  ),
}))

const ToastExample = ({ variant = 'default' as any }) => (
  <ToastProvider>
    <Toast variant={variant} data-testid="toast-example">
      <ToastTitle>Toast Title</ToastTitle>
      <ToastDescription>This is a toast description</ToastDescription>
      <ToastAction data-testid="toast-action-example">Action</ToastAction>
      <ToastClose />
    </Toast>
    <ToastViewport />
  </ToastProvider>
)

describe('Toast', () => {
  describe('Basic Rendering', () => {
    it('renders toast with all components', () => {
      render(<ToastExample />)
      
      expect(screen.getByTestId('toast-provider')).toBeInTheDocument()
      expect(screen.getByTestId('toast-viewport')).toBeInTheDocument()
      expect(screen.getByTestId('toast-root')).toBeInTheDocument()
      expect(screen.getByTestId('toast-title')).toBeInTheDocument()
      expect(screen.getByTestId('toast-description')).toBeInTheDocument()
      expect(screen.getByTestId('toast-action')).toBeInTheDocument()
      expect(screen.getByTestId('toast-close')).toBeInTheDocument()
    })

    it('renders with correct default classes', () => {
      render(<Toast>Toast content</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'group',
        'pointer-events-auto',
        'relative',
        'flex',
        'w-full',
        'items-center',
        'justify-between',
        'space-x-4',
        'overflow-hidden',
        'rounded-md',
        'border',
        'p-6',
        'pr-8',
        'shadow-lg'
      )
    })

    it('renders viewport with correct classes', () => {
      render(
        <ToastProvider>
          <ToastViewport />
        </ToastProvider>
      )
      
      const viewport = screen.getByTestId('toast-viewport')
      expect(viewport).toHaveClass(
        'fixed',
        'top-0',
        'z-[100]',
        'flex',
        'max-h-screen',
        'w-full',
        'flex-col-reverse',
        'p-4',
        'sm:bottom-0',
        'sm:right-0',
        'sm:top-auto',
        'sm:flex-col',
        'md:max-w-[420px]'
      )
    })
  })

  describe('Toast Variants', () => {
    it('renders default variant correctly', () => {
      render(<Toast variant="default">Default toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('border', 'bg-background', 'text-foreground')
    })

    it('renders destructive variant correctly', () => {
      render(<Toast variant="destructive">Destructive toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'destructive',
        'border-destructive',
        'bg-destructive',
        'text-destructive-foreground'
      )
    })

    it('renders success variant correctly', () => {
      render(<Toast variant="success">Success toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'border-green-500',
        'bg-green-50',
        'text-green-800',
        'dark:bg-green-900/20',
        'dark:text-green-400',
        'dark:border-green-500/50'
      )
    })

    it('renders warning variant correctly', () => {
      render(<Toast variant="warning">Warning toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'border-yellow-500',
        'bg-yellow-50',
        'text-yellow-800',
        'dark:bg-yellow-900/20',
        'dark:text-yellow-400',
        'dark:border-yellow-500/50'
      )
    })

    it('renders info variant correctly', () => {
      render(<Toast variant="info">Info toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'border-blue-500',
        'bg-blue-50',
        'text-blue-800',
        'dark:bg-blue-900/20',
        'dark:text-blue-400',
        'dark:border-blue-500/50'
      )
    })

    it('renders loading variant correctly', () => {
      render(<Toast variant="loading">Loading toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'border-gray-500',
        'bg-gray-50',
        'text-gray-800',
        'dark:bg-gray-900/20',
        'dark:text-gray-400',
        'dark:border-gray-500/50'
      )
    })
  })

  describe('Toast Components', () => {
    it('renders title with correct styling', () => {
      render(<ToastTitle>Toast Title</ToastTitle>)
      
      const title = screen.getByTestId('toast-title')
      expect(title).toHaveClass('text-sm', 'font-semibold')
      expect(title).toHaveTextContent('Toast Title')
    })

    it('renders description with correct styling', () => {
      render(<ToastDescription>Toast description</ToastDescription>)
      
      const description = screen.getByTestId('toast-description')
      expect(description).toHaveClass('text-sm', 'opacity-90')
      expect(description).toHaveTextContent('Toast description')
    })

    it('renders action button with correct styling', () => {
      render(<ToastAction>Action</ToastAction>)
      
      const action = screen.getByTestId('toast-action')
      expect(action).toHaveClass(
        'inline-flex',
        'h-8',
        'shrink-0',
        'items-center',
        'justify-center',
        'rounded-md',
        'border',
        'bg-transparent',
        'px-3',
        'text-sm',
        'font-medium'
      )
      expect(action).toHaveTextContent('Action')
    })

    it('renders close button with X icon', () => {
      render(<ToastClose />)
      
      const closeButton = screen.getByTestId('toast-close')
      const xIcon = screen.getByTestId('x-icon')
      
      expect(closeButton).toHaveClass(
        'absolute',
        'right-2',
        'top-2',
        'rounded-md',
        'p-1',
        'text-foreground/50',
        'opacity-0',
        'transition-opacity'
      )
      expect(xIcon).toBeInTheDocument()
      expect(xIcon).toHaveClass('h-4', 'w-4')
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className for toast', () => {
      render(<Toast className="custom-toast bg-purple-500">Toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('custom-toast', 'bg-purple-500')
    })

    it('accepts custom className for components', () => {
      render(
        <Toast>
          <ToastTitle className="custom-title text-xl">Title</ToastTitle>
          <ToastDescription className="custom-description text-base">Description</ToastDescription>
          <ToastAction className="custom-action bg-blue-500">Action</ToastAction>
          <ToastClose className="custom-close" />
        </Toast>
      )
      
      expect(screen.getByTestId('toast-title')).toHaveClass('custom-title', 'text-xl')
      expect(screen.getByTestId('toast-description')).toHaveClass('custom-description', 'text-base')
      expect(screen.getByTestId('toast-action')).toHaveClass('custom-action', 'bg-blue-500')
      expect(screen.getByTestId('toast-close')).toHaveClass('custom-close')
    })

    it('merges custom classes with default classes', () => {
      render(<ToastTitle className="text-lg">Custom Title</ToastTitle>)
      
      const title = screen.getByTestId('toast-title')
      expect(title).toHaveClass('text-sm', 'font-semibold', 'text-lg')
    })
  })

  describe('User Interaction', () => {
    it('handles action button click', async () => {
      const user = userEvent.setup()
      const handleAction = jest.fn()
      
      render(<ToastAction onClick={handleAction}>Retry</ToastAction>)
      
      const actionButton = screen.getByTestId('toast-action')
      await user.click(actionButton)
      
      expect(handleAction).toHaveBeenCalledTimes(1)
    })

    it('handles close button click', async () => {
      const user = userEvent.setup()
      const handleClose = jest.fn()
      
      render(<ToastClose onClick={handleClose} />)
      
      const closeButton = screen.getByTestId('toast-close')
      await user.click(closeButton)
      
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <Toast>
          <ToastAction>Action</ToastAction>
          <ToastClose />
        </Toast>
      )
      
      const actionButton = screen.getByTestId('toast-action')
      const closeButton = screen.getByTestId('toast-close')
      
      actionButton.focus()
      expect(actionButton).toHaveFocus()
      
      await user.keyboard('{Tab}')
      expect(closeButton).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      render(
        <Toast>
          <ToastAction>Action</ToastAction>
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument() // Close button
    })

    it('supports ARIA attributes', () => {
      render(
        <Toast aria-label="Success notification">
          <ToastTitle>Success</ToastTitle>
          <ToastDescription>Operation completed successfully</ToastDescription>
        </Toast>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveAttribute('aria-label', 'Success notification')
    })

    it('supports focus management', () => {
      render(
        <Toast>
          <ToastAction autoFocus>Primary Action</ToastAction>
          <ToastClose />
        </Toast>
      )
      
      const actionButton = screen.getByTestId('toast-action')
      expect(actionButton).toHaveAttribute('autoFocus')
    })
  })

  describe('Complex Layouts', () => {
    it('renders toast with multiple actions', () => {
      render(
        <Toast>
          <ToastTitle>File Upload Failed</ToastTitle>
          <ToastDescription>Unable to upload file. Would you like to retry?</ToastDescription>
          <div className="flex gap-2">
            <ToastAction>Retry</ToastAction>
            <ToastAction>Cancel</ToastAction>
          </div>
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByText('File Upload Failed')).toBeInTheDocument()
      expect(screen.getByText(/unable to upload file/i)).toBeInTheDocument()
      expect(screen.getAllByTestId('toast-action')).toHaveLength(2)
    })

    it('renders toast with rich content', () => {
      render(
        <Toast>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              ✓
            </div>
            <div>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Your changes have been saved</ToastDescription>
            </div>
          </div>
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByText('✓')).toBeInTheDocument()
      expect(screen.getByText('Success')).toBeInTheDocument()
      expect(screen.getByText('Your changes have been saved')).toBeInTheDocument()
    })

    it('renders toast with progress indicator', () => {
      render(
        <Toast>
          <ToastTitle>Uploading...</ToastTitle>
          <ToastDescription>Progress: 75%</ToastDescription>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </Toast>
      )
      
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
      expect(screen.getByText('Progress: 75%')).toBeInTheDocument()
      expect(screen.getByRole('generic')).toBeInTheDocument() // Progress bar
    })
  })

  describe('Common Usage Patterns', () => {
    it('works as success notification', () => {
      render(
        <Toast variant="success">
          <ToastTitle>Success!</ToastTitle>
          <ToastDescription>Your profile has been updated successfully.</ToastDescription>
          <ToastClose />
        </Toast>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('border-green-500')
      expect(screen.getByText('Success!')).toBeInTheDocument()
      expect(screen.getByText(/profile has been updated/i)).toBeInTheDocument()
    })

    it('works as error notification with action', () => {
      render(
        <Toast variant="destructive">
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>Failed to save changes. Please try again.</ToastDescription>
          <ToastAction>Retry</ToastAction>
          <ToastClose />
        </Toast>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('destructive')
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('works as loading notification', () => {
      render(
        <Toast variant="loading">
          <ToastTitle>Processing...</ToastTitle>
          <ToastDescription>Please wait while we process your request.</ToastDescription>
        </Toast>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('border-gray-500')
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('works as undo notification', () => {
      render(
        <Toast>
          <ToastTitle>Item deleted</ToastTitle>
          <ToastDescription>The item has been moved to trash.</ToastDescription>
          <ToastAction>Undo</ToastAction>
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByText('Item deleted')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing title gracefully', () => {
      render(
        <Toast>
          <ToastDescription>Description only toast</ToastDescription>
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByText('Description only toast')).toBeInTheDocument()
      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument()
    })

    it('handles missing description gracefully', () => {
      render(
        <Toast>
          <ToastTitle>Title only toast</ToastTitle>
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByText('Title only toast')).toBeInTheDocument()
      expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument()
    })

    it('handles very long content', () => {
      const longTitle = 'Very long title '.repeat(20)
      const longDescription = 'Very long description '.repeat(50)
      
      render(
        <Toast>
          <ToastTitle>{longTitle}</ToastTitle>
          <ToastDescription>{longDescription}</ToastDescription>
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByText(longTitle)).toBeInTheDocument()
      expect(screen.getByText(longDescription)).toBeInTheDocument()
    })

    it('handles empty content', () => {
      render(
        <Toast data-testid="empty-toast">
          <ToastClose />
        </Toast>
      )
      
      expect(screen.getByTestId('empty-toast')).toBeInTheDocument()
      expect(screen.getByTestId('toast-close')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('handles responsive viewport layout', () => {
      render(
        <ToastProvider>
          <ToastViewport className="sm:max-w-md md:max-w-lg" />
        </ToastProvider>
      )
      
      const viewport = screen.getByTestId('toast-viewport')
      expect(viewport).toHaveClass('sm:max-w-md', 'md:max-w-lg')
    })

    it('handles responsive content layout', () => {
      render(
        <Toast className="flex-col sm:flex-row">
          <div className="flex-1">
            <ToastTitle>Responsive Toast</ToastTitle>
            <ToastDescription>Adapts to screen size</ToastDescription>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <ToastAction>Action</ToastAction>
            <ToastClose />
          </div>
        </Toast>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('flex-col', 'sm:flex-row')
    })
  })

  describe('Animation Classes', () => {
    it('has correct animation classes', () => {
      render(<Toast>Animated toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[swipe=end]:animate-out',
        'data-[state=closed]:fade-out-80',
        'data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:slide-in-from-top-full',
        'data-[state=open]:sm:slide-in-from-bottom-full'
      )
    })

    it('has swipe gesture classes', () => {
      render(<Toast>Swipeable toast</Toast>)
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'data-[swipe=cancel]:translate-x-0',
        'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
        'data-[swipe=move]:transition-none'
      )
    })
  })
})
