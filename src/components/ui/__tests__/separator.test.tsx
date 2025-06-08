import { render, screen } from '@testing-library/react'
import { Separator } from '../separator'

// Mock Radix UI Separator primitive
jest.mock('@radix-ui/react-separator', () => ({
  Root: ({ className, orientation = 'horizontal', decorative = true, ...props }: any) => (
    <div
      data-testid="separator-root"
      className={className}
      data-orientation={orientation}
      aria-orientation={orientation}
      role={decorative ? 'none' : 'separator'}
      {...props}
    />
  ),
}))

describe('Separator', () => {
  describe('Basic Rendering', () => {
    it('renders separator with default props', () => {
      render(<Separator data-testid="separator" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveAttribute('data-slot', 'separator')
    })

    it('renders with correct default classes', () => {
      render(<Separator />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveClass(
        'bg-border',
        'shrink-0',
        'data-[orientation=horizontal]:h-px',
        'data-[orientation=horizontal]:w-full',
        'data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:w-px'
      )
    })

    it('applies default orientation as horizontal', () => {
      render(<Separator />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('data-orientation', 'horizontal')
      expect(separator).toHaveAttribute('aria-orientation', 'horizontal')
    })

    it('applies default decorative as true', () => {
      render(<Separator />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('role', 'none')
    })
  })

  describe('Orientation', () => {
    it('renders horizontal separator correctly', () => {
      render(<Separator orientation="horizontal" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('data-orientation', 'horizontal')
      expect(separator).toHaveAttribute('aria-orientation', 'horizontal')
      expect(separator).toHaveClass(
        'data-[orientation=horizontal]:h-px',
        'data-[orientation=horizontal]:w-full'
      )
    })

    it('renders vertical separator correctly', () => {
      render(<Separator orientation="vertical" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('data-orientation', 'vertical')
      expect(separator).toHaveAttribute('aria-orientation', 'vertical')
      expect(separator).toHaveClass(
        'data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:w-px'
      )
    })
  })

  describe('Decorative vs Semantic', () => {
    it('renders as decorative by default', () => {
      render(<Separator />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('role', 'none')
    })

    it('renders as semantic separator when decorative is false', () => {
      render(<Separator decorative={false} />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('role', 'separator')
    })

    it('handles explicit decorative true', () => {
      render(<Separator decorative={true} />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('role', 'none')
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(<Separator className="custom-separator border-red-500" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveClass('custom-separator', 'border-red-500')
    })

    it('merges custom classes with default classes', () => {
      render(<Separator className="border-2 custom-border" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveClass('bg-border', 'border-2', 'custom-border')
    })

    it('applies custom styles for different themes', () => {
      render(<Separator className="bg-gray-200 dark:bg-gray-700" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveClass('bg-gray-200', 'dark:bg-gray-700')
    })
  })

  describe('Accessibility', () => {
    it('has proper role for decorative separator', () => {
      render(<Separator decorative={true} />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('role', 'none')
    })

    it('has proper role for semantic separator', () => {
      render(<Separator decorative={false} />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('role', 'separator')
    })

    it('has proper aria-orientation attribute', () => {
      render(<Separator orientation="vertical" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveAttribute('aria-orientation', 'vertical')
    })
  })

  describe('Layout Usage Patterns', () => {
    it('works in horizontal layouts', () => {
      render(
        <div data-testid="horizontal-layout" className="flex flex-col space-y-4">
          <div>Content above</div>
          <Separator data-testid="horizontal-sep" />
          <div>Content below</div>
        </div>
      )
      
      expect(screen.getByTestId('horizontal-layout')).toBeInTheDocument()
      expect(screen.getByTestId('horizontal-sep')).toBeInTheDocument()
      expect(screen.getByText('Content above')).toBeInTheDocument()
      expect(screen.getByText('Content below')).toBeInTheDocument()
    })

    it('works in vertical layouts', () => {
      render(
        <div data-testid="vertical-layout" className="flex items-center space-x-4">
          <div>Left content</div>
          <Separator orientation="vertical" data-testid="vertical-sep" />
          <div>Right content</div>
        </div>
      )
      
      expect(screen.getByTestId('vertical-layout')).toBeInTheDocument()
      expect(screen.getByTestId('vertical-sep')).toBeInTheDocument()
      expect(screen.getByText('Left content')).toBeInTheDocument()
      expect(screen.getByText('Right content')).toBeInTheDocument()
    })

    it('works in navigation menus', () => {
      render(
        <nav data-testid="navigation" className="flex items-center space-x-4">
          <a href="/">Home</a>
          <Separator orientation="vertical" className="h-4" />
          <a href="/about">About</a>
          <Separator orientation="vertical" className="h-4" />
          <a href="/contact">Contact</a>
        </nav>
      )
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument()
      expect(screen.getAllByTestId('separator-root')).toHaveLength(2)
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument()
    })

    it('works in card layouts', () => {
      render(
        <div data-testid="card" className="bg-white rounded-lg shadow p-6">
          <h2>Card Title</h2>
          <Separator className="my-4" />
          <p>Card content goes here</p>
          <Separator className="my-4" />
          <div>Card footer</div>
        </div>
      )
      
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getAllByTestId('separator-root')).toHaveLength(2)
      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card content goes here')).toBeInTheDocument()
    })
  })

  describe('Sidebar Usage', () => {
    it('works in sidebar layouts', () => {
      render(
        <div data-testid="sidebar" className="w-64 bg-gray-100 h-screen">
          <div className="p-4">
            <h3>Navigation</h3>
          </div>
          <Separator />
          <nav className="p-4 space-y-2">
            <a href="/dashboard">Dashboard</a>
            <a href="/files">Files</a>
          </nav>
          <Separator />
          <div className="p-4">
            <h3>Settings</h3>
          </div>
        </div>
      )
      
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getAllByTestId('separator-root')).toHaveLength(2)
      expect(screen.getByText('Navigation')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('works with vertical separators in toolbar', () => {
      render(
        <div data-testid="toolbar" className="flex items-center p-2 bg-gray-50">
          <button>Bold</button>
          <Separator orientation="vertical" className="mx-2 h-4" />
          <button>Italic</button>
          <Separator orientation="vertical" className="mx-2 h-4" />
          <button>Underline</button>
        </div>
      )
      
      expect(screen.getByTestId('toolbar')).toBeInTheDocument()
      expect(screen.getAllByTestId('separator-root')).toHaveLength(2)
      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /underline/i })).toBeInTheDocument()
    })
  })

  describe('Complex Layouts', () => {
    it('works in nested layouts', () => {
      render(
        <div data-testid="complex-layout">
          <header className="p-4">
            <h1>Page Title</h1>
          </header>
          <Separator />
          <main className="flex">
            <aside className="w-64 p-4">
              <nav>
                <a href="/item1">Item 1</a>
                <Separator orientation="vertical" className="my-2" />
                <a href="/item2">Item 2</a>
              </nav>
            </aside>
            <Separator orientation="vertical" />
            <section className="flex-1 p-4">
              <h2>Main Content</h2>
              <Separator className="my-4" />
              <p>Content here</p>
            </section>
          </main>
        </div>
      )
      
      expect(screen.getByTestId('complex-layout')).toBeInTheDocument()
      expect(screen.getAllByTestId('separator-root')).toHaveLength(4)
      expect(screen.getByText('Page Title')).toBeInTheDocument()
      expect(screen.getByText('Main Content')).toBeInTheDocument()
    })

    it('works with responsive layouts', () => {
      render(
        <div data-testid="responsive-layout">
          <div className="block md:hidden">
            {/* Mobile layout with horizontal separators */}
            <div>Item 1</div>
            <Separator className="my-2" />
            <div>Item 2</div>
            <Separator className="my-2" />
            <div>Item 3</div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {/* Desktop layout with vertical separators */}
            <div>Item 1</div>
            <Separator orientation="vertical" className="h-4" />
            <div>Item 2</div>
            <Separator orientation="vertical" className="h-4" />
            <div>Item 3</div>
          </div>
        </div>
      )
      
      expect(screen.getByTestId('responsive-layout')).toBeInTheDocument()
      expect(screen.getAllByTestId('separator-root')).toHaveLength(4)
    })
  })

  describe('Edge Cases', () => {
    it('handles zero dimensions gracefully', () => {
      render(<Separator className="w-0 h-0" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveClass('w-0', 'h-0')
    })

    it('handles very large dimensions', () => {
      render(<Separator className="w-screen h-screen" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveClass('w-screen', 'h-screen')
    })

    it('handles custom colors and opacity', () => {
      render(<Separator className="bg-red-500 opacity-50" />)
      
      const separator = screen.getByTestId('separator-root')
      expect(separator).toHaveClass('bg-red-500', 'opacity-50')
    })
  })

  describe('Form Usage', () => {
    it('works in form layouts', () => {
      render(
        <form data-testid="form-layout">
          <fieldset>
            <legend>Personal Information</legend>
            <input type="text" placeholder="Name" />
            <input type="email" placeholder="Email" />
          </fieldset>
          
          <Separator className="my-6" />
          
          <fieldset>
            <legend>Address Information</legend>
            <input type="text" placeholder="Street" />
            <input type="text" placeholder="City" />
          </fieldset>
        </form>
      )
      
      expect(screen.getByTestId('form-layout')).toBeInTheDocument()
      expect(screen.getByTestId('separator-root')).toBeInTheDocument()
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
      expect(screen.getByText('Address Information')).toBeInTheDocument()
    })
  })
})
