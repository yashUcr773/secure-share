import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  Sheet, 
  SheetTrigger, 
  SheetClose, 
  SheetContent, 
  SheetHeader, 
  SheetFooter, 
  SheetTitle, 
  SheetDescription 
} from '../sheet'

// Mock Radix UI Dialog primitives
jest.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="sheet-root" {...props}>{children}</div>,
  Trigger: ({ children, ...props }: any) => <button data-testid="sheet-trigger" {...props}>{children}</button>,
  Close: ({ children, ...props }: any) => <button data-testid="sheet-close" {...props}>{children}</button>,
  Portal: ({ children }: any) => <div data-testid="sheet-portal">{children}</div>,
  Overlay: ({ className, ...props }: any) => <div data-testid="sheet-overlay" className={className} {...props} />,
  Content: ({ className, children, ...props }: any) => (
    <div data-testid="sheet-content" className={className} {...props}>
      {children}
    </div>
  ),
  Title: ({ className, children, ...props }: any) => (
    <h2 data-testid="sheet-title" className={className} {...props}>
      {children}
    </h2>
  ),
  Description: ({ className, children, ...props }: any) => (
    <p data-testid="sheet-description" className={className} {...props}>
      {children}
    </p>
  ),
}))

// Mock XIcon from lucide-react
jest.mock('lucide-react', () => ({
  XIcon: ({ className, ...props }: any) => (
    <svg data-testid="x-icon" className={className} {...props}>
      <path d="m18 6-12 12M6 6l12 12" />
    </svg>
  ),
}))

const SheetExample = ({ side = 'right' as any }) => (
  <Sheet data-testid="sheet-example">
    <SheetTrigger data-testid="open-sheet">Open Sheet</SheetTrigger>
    <SheetContent side={side} data-testid="sheet-content-example">
      <SheetHeader data-testid="sheet-header-example">
        <SheetTitle data-testid="sheet-title-example">Sheet Title</SheetTitle>
        <SheetDescription data-testid="sheet-description-example">
          This is a sheet description
        </SheetDescription>
      </SheetHeader>
      
      <div data-testid="sheet-body" className="flex-1 p-4">
        <p>Sheet body content goes here</p>
      </div>
      
      <SheetFooter data-testid="sheet-footer-example">
        <SheetClose data-testid="close-sheet">Close</SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
)

describe('Sheet', () => {
  describe('Basic Rendering', () => {
    it('renders sheet with all components', () => {
      render(<SheetExample />)
      
      expect(screen.getByTestId('sheet-root')).toBeInTheDocument()
      expect(screen.getByTestId('sheet-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('sheet-content')).toBeInTheDocument()
      expect(screen.getByTestId('sheet-title')).toBeInTheDocument()
      expect(screen.getByTestId('sheet-description')).toBeInTheDocument()
    })

    it('renders with correct default classes', () => {
      render(<SheetExample />)
      
      const overlay = screen.getByTestId('sheet-overlay')
      expect(overlay).toHaveClass(
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'fixed',
        'inset-0',
        'z-50',
        'bg-black/50'
      )
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass(
        'bg-background',
        'fixed',
        'z-50',
        'flex',
        'flex-col',
        'gap-4',
        'shadow-lg'
      )
    })

    it('applies data-slot attributes correctly', () => {
      render(<SheetExample />)
      
      expect(screen.getByTestId('sheet-root')).toHaveAttribute('data-slot', 'sheet')
      expect(screen.getByTestId('sheet-trigger')).toHaveAttribute('data-slot', 'sheet-trigger')
      expect(screen.getByTestId('sheet-overlay')).toHaveAttribute('data-slot', 'sheet-overlay')
      expect(screen.getByTestId('sheet-content')).toHaveAttribute('data-slot', 'sheet-content')
      expect(screen.getByTestId('sheet-title')).toHaveAttribute('data-slot', 'sheet-title')
      expect(screen.getByTestId('sheet-description')).toHaveAttribute('data-slot', 'sheet-description')
    })
  })

  describe('Sheet Sides', () => {
    it('renders with right side classes (default)', () => {
      render(<SheetExample side="right" />)
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass(
        'data-[state=closed]:slide-out-to-right',
        'data-[state=open]:slide-in-from-right',
        'inset-y-0',
        'right-0',
        'h-full',
        'w-3/4',
        'border-l',
        'sm:max-w-sm'
      )
    })

    it('renders with left side classes', () => {
      render(<SheetExample side="left" />)
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass(
        'data-[state=closed]:slide-out-to-left',
        'data-[state=open]:slide-in-from-left',
        'inset-y-0',
        'left-0',
        'h-full',
        'w-3/4',
        'border-r',
        'sm:max-w-sm'
      )
    })

    it('renders with top side classes', () => {
      render(<SheetExample side="top" />)
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass(
        'data-[state=closed]:slide-out-to-top',
        'data-[state=open]:slide-in-from-top',
        'inset-x-0',
        'top-0',
        'h-auto',
        'border-b'
      )
    })

    it('renders with bottom side classes', () => {
      render(<SheetExample side="bottom" />)
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass(
        'data-[state=closed]:slide-out-to-bottom',
        'data-[state=open]:slide-in-from-bottom',
        'inset-x-0',
        'bottom-0',
        'h-auto',
        'border-t'
      )
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className props', () => {
      render(
        <Sheet>
          <SheetTrigger className="custom-trigger">Open</SheetTrigger>
          <SheetContent className="custom-content">
            <SheetHeader className="custom-header">
              <SheetTitle className="custom-title">Title</SheetTitle>
              <SheetDescription className="custom-description">Description</SheetDescription>
            </SheetHeader>
            <SheetFooter className="custom-footer">
              <SheetClose className="custom-close">Close</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByTestId('sheet-trigger')).toHaveClass('custom-trigger')
      expect(screen.getByTestId('sheet-content')).toHaveClass('custom-content')
      expect(screen.getByTestId('sheet-title')).toHaveClass('custom-title')
      expect(screen.getByTestId('sheet-description')).toHaveClass('custom-description')
    })

    it('merges custom classes with default classes', () => {
      render(
        <Sheet>
          <SheetContent className="custom-background">
            Content
          </SheetContent>
        </Sheet>
      )
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('bg-background', 'custom-background')
    })
  })

  describe('Close Button', () => {
    it('renders close button with X icon', () => {
      render(<SheetExample />)
      
      const xIcon = screen.getByTestId('x-icon')
      expect(xIcon).toBeInTheDocument()
      expect(xIcon).toHaveClass('size-4')
    })

    it('has accessibility attributes for close button', () => {
      render(<SheetExample />)
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
      expect(screen.getByText('Close')).toBeInTheDocument()
    })
  })

  describe('Header and Footer Layout', () => {
    it('renders header with correct styling', () => {
      render(<SheetExample />)
      
      const header = screen.getByTestId('sheet-header-example')
      expect(header).toHaveClass('flex', 'flex-col', 'gap-1.5', 'p-4')
      expect(header).toHaveAttribute('data-slot', 'sheet-header')
    })

    it('renders footer with correct styling', () => {
      render(<SheetExample />)
      
      const footer = screen.getByTestId('sheet-footer-example')
      expect(footer).toHaveClass('mt-auto', 'flex', 'flex-col', 'gap-2', 'p-4')
      expect(footer).toHaveAttribute('data-slot', 'sheet-footer')
    })

    it('renders title with correct styling', () => {
      render(<SheetExample />)
      
      const title = screen.getByTestId('sheet-title-example')
      expect(title).toHaveClass('text-foreground', 'font-semibold')
    })

    it('renders description with correct styling', () => {
      render(<SheetExample />)
      
      const description = screen.getByTestId('sheet-description-example')
      expect(description).toHaveClass('text-muted-foreground', 'text-sm')
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA roles', () => {
      render(<SheetExample />)
      
      expect(screen.getByRole('button', { name: /open sheet/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('provides screen reader text for close button', () => {
      render(<SheetExample />)
      
      expect(screen.getByText('Close')).toHaveClass('sr-only')
    })
  })

  describe('Complex Layouts', () => {
    it('renders sheet with form content', () => {
      render(
        <Sheet>
          <SheetTrigger>Edit Profile</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit Profile</SheetTitle>
              <SheetDescription>Make changes to your profile here</SheetDescription>
            </SheetHeader>
            
            <form data-testid="profile-form" className="space-y-4">
              <div>
                <label htmlFor="name">Name</label>
                <input id="name" type="text" />
              </div>
              <div>
                <label htmlFor="email">Email</label>
                <input id="email" type="email" />
              </div>
            </form>
            
            <SheetFooter>
              <button type="submit">Save Changes</button>
              <SheetClose>Cancel</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByTestId('profile-form')).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    it('renders sheet with navigation content', () => {
      render(
        <Sheet>
          <SheetTrigger>Menu</SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            
            <nav data-testid="navigation" className="space-y-2">
              <a href="/dashboard">Dashboard</a>
              <a href="/files">Files</a>
              <a href="/settings">Settings</a>
            </nav>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /files/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })
  })

  describe('Common Usage Patterns', () => {
    it('works as mobile navigation', () => {
      render(
        <Sheet>
          <SheetTrigger data-testid="mobile-menu-trigger">☰</SheetTrigger>
          <SheetContent side="left" data-testid="mobile-menu">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            
            <nav className="space-y-4">
              <a href="/" className="block">Home</a>
              <a href="/about" className="block">About</a>
              <a href="/contact" className="block">Contact</a>
            </nav>
          </SheetContent>
        </Sheet>
      )
      
      const trigger = screen.getByTestId('mobile-menu-trigger')
      const menu = screen.getByTestId('mobile-menu')
      
      expect(trigger).toBeInTheDocument()
      expect(menu).toBeInTheDocument()
      expect(menu).toHaveClass('data-[state=closed]:slide-out-to-left')
    })

    it('works as settings panel', () => {
      render(
        <Sheet>
          <SheetTrigger>Settings</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>Configure your preferences</SheetDescription>
            </SheetHeader>
            
            <div className="space-y-6">
              <div data-testid="theme-setting">
                <h3>Theme</h3>
                <select>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              
              <div data-testid="notification-setting">
                <h3>Notifications</h3>
                <input type="checkbox" id="notifications" />
                <label htmlFor="notifications">Enable notifications</label>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByTestId('theme-setting')).toBeInTheDocument()
      expect(screen.getByTestId('notification-setting')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('works as confirmation dialog', () => {
      render(
        <Sheet>
          <SheetTrigger>Delete Item</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Confirm Deletion</SheetTitle>
              <SheetDescription>
                Are you sure you want to delete this item? This action cannot be undone.
              </SheetDescription>
            </SheetHeader>
            
            <SheetFooter className="gap-2">
              <button className="bg-red-500 text-white">Delete</button>
              <SheetClose>Cancel</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument()
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing title gracefully', () => {
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetDescription>Only description, no title</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByText('Only description, no title')).toBeInTheDocument()
      expect(screen.queryByTestId('sheet-title')).not.toBeInTheDocument()
    })

    it('handles missing description gracefully', () => {
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Only title, no description</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByText('Only title, no description')).toBeInTheDocument()
      expect(screen.queryByTestId('sheet-description')).not.toBeInTheDocument()
    })

    it('handles empty content', () => {
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent data-testid="empty-sheet">
            {/* Empty content */}
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByTestId('empty-sheet')).toBeInTheDocument()
    })

    it('handles very long content', () => {
      const longText = 'Very long content '.repeat(100)
      
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Long Content Sheet</SheetTitle>
            </SheetHeader>
            <div data-testid="long-content">{longText}</div>
          </SheetContent>
        </Sheet>
      )
      
      expect(screen.getByTestId('long-content')).toBeInTheDocument()
      expect(screen.getByTestId('long-content')).toHaveTextContent(longText)
    })
  })

  describe('Responsive Behavior', () => {
    it('applies responsive classes correctly', () => {
      render(<SheetExample />)
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('sm:max-w-sm') // Responsive max-width
    })

    it('handles different screen sizes for mobile navigation', () => {
      render(
        <Sheet>
          <SheetTrigger>Menu</SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-3/4 md:w-1/2">
            <nav>Navigation items</nav>
          </SheetContent>
        </Sheet>
      )
      
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('w-full', 'sm:w-3/4', 'md:w-1/2')
    })
  })
})
