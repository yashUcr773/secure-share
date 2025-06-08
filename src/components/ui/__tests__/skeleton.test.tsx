import { render, screen } from '@testing-library/react'
import { Skeleton } from '../skeleton'

describe('Skeleton', () => {
  describe('Basic Rendering', () => {
    it('renders skeleton with default classes', () => {
      render(<Skeleton data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass(
        'bg-accent',
        'animate-pulse',
        'rounded-md'
      )
    })

    it('renders as a div element', () => {
      render(<Skeleton data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton.tagName).toBe('DIV')
    })

    it('forwards all props to div element', () => {
      render(
        <Skeleton
          data-testid="skeleton"
          aria-label="Loading content"
          role="status"
          tabIndex={0}
        />
      )
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content')
      expect(skeleton).toHaveAttribute('role', 'status')
      expect(skeleton).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<Skeleton className="custom-skeleton" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('custom-skeleton')
    })

    it('merges custom className with default classes', () => {
      render(<Skeleton className="h-4 w-32" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-4', 'w-32')
      expect(skeleton).toHaveClass('bg-accent', 'animate-pulse', 'rounded-md')
    })

    it('supports inline styles', () => {
      render(
        <Skeleton
          style={{ width: '200px', height: '20px', backgroundColor: 'gray' }}
          data-testid="skeleton"
        />
      )
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveStyle('width: 200px')
      expect(skeleton).toHaveStyle('height: 20px')
      expect(skeleton).toHaveStyle('background-color: gray')
    })
  })

  describe('Data Attributes', () => {
    it('sets correct data-slot attribute', () => {
      render(<Skeleton data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveAttribute('data-slot', 'skeleton')
    })

    it('supports custom data attributes', () => {
      render(
        <Skeleton
          data-testid="skeleton"
          data-skeleton-type="text"
          data-loading-state="true"
        />
      )
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveAttribute('data-skeleton-type', 'text')
      expect(skeleton).toHaveAttribute('data-loading-state', 'true')
    })
  })

  describe('Accessibility', () => {
    it('supports aria attributes for accessibility', () => {
      render(
        <Skeleton
          data-testid="skeleton"
          aria-label="Loading user profile"
          role="status"
          aria-live="polite"
        />
      )
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading user profile')
      expect(skeleton).toHaveAttribute('role', 'status')
      expect(skeleton).toHaveAttribute('aria-live', 'polite')
    })

    it('can be made focusable for screen readers', () => {
      render(
        <Skeleton
          data-testid="skeleton"
          tabIndex={0}
          aria-label="Content is loading"
        />
      )
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveAttribute('tabIndex', '0')
      expect(skeleton).toHaveAttribute('aria-label', 'Content is loading')
    })
  })

  describe('Animation', () => {
    it('applies pulse animation by default', () => {
      render(<Skeleton data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('animate-pulse')
    })

    it('can disable animation with custom class', () => {
      render(<Skeleton className="animate-none" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('animate-none')
    })
  })

  describe('Shape Variations', () => {
    it('can be styled as circular skeleton', () => {
      render(<Skeleton className="rounded-full w-12 h-12" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('rounded-full', 'w-12', 'h-12')
    })

    it('can be styled as rectangular skeleton', () => {
      render(<Skeleton className="rounded-none w-full h-32" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('rounded-none', 'w-full', 'h-32')
    })

    it('can be styled as text skeleton', () => {
      render(<Skeleton className="h-4 w-3/4" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-4', 'w-3/4')
    })
  })

  describe('Size Variations', () => {
    it('can render small skeleton', () => {
      render(<Skeleton className="h-2 w-16" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-2', 'w-16')
    })

    it('can render medium skeleton', () => {
      render(<Skeleton className="h-4 w-32" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-4', 'w-32')
    })

    it('can render large skeleton', () => {
      render(<Skeleton className="h-8 w-64" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-8', 'w-64')
    })
  })

  describe('Complex Layouts', () => {
    it('can be used in card skeleton layout', () => {
      render(
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" data-testid="title-skeleton" />
          <Skeleton className="h-3 w-1/2" data-testid="subtitle-skeleton" />
          <div className="space-y-2">
            <Skeleton className="h-2 w-full" data-testid="line1-skeleton" />
            <Skeleton className="h-2 w-full" data-testid="line2-skeleton" />
            <Skeleton className="h-2 w-2/3" data-testid="line3-skeleton" />
          </div>
        </div>
      )
      
      expect(screen.getByTestId('title-skeleton')).toHaveClass('h-4', 'w-3/4')
      expect(screen.getByTestId('subtitle-skeleton')).toHaveClass('h-3', 'w-1/2')
      expect(screen.getByTestId('line1-skeleton')).toHaveClass('h-2', 'w-full')
      expect(screen.getByTestId('line3-skeleton')).toHaveClass('h-2', 'w-2/3')
    })

    it('can be used in table skeleton layout', () => {
      render(
        <div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex space-x-4 mb-4">
              <Skeleton className="h-4 w-4 rounded-full" data-testid={`avatar-${i}`} />
              <Skeleton className="h-4 w-32" data-testid={`name-${i}`} />
              <Skeleton className="h-4 w-24" data-testid={`status-${i}`} />
            </div>
          ))}
        </div>
      )
      
      for (let i = 0; i < 3; i++) {
        expect(screen.getByTestId(`avatar-${i}`)).toHaveClass('h-4', 'w-4', 'rounded-full')
        expect(screen.getByTestId(`name-${i}`)).toHaveClass('h-4', 'w-32')
        expect(screen.getByTestId(`status-${i}`)).toHaveClass('h-4', 'w-24')
      }
    })
  })

  describe('Common Usage Patterns', () => {
    it('works as text line skeleton', () => {
      render(<Skeleton className="h-4 w-full" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-4', 'w-full')
    })

    it('works as avatar skeleton', () => {
      render(<Skeleton className="h-12 w-12 rounded-full" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-12', 'w-12', 'rounded-full')
    })

    it('works as button skeleton', () => {
      render(<Skeleton className="h-10 w-24 rounded-md" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-10', 'w-24', 'rounded-md')
    })

    it('works as image skeleton', () => {
      render(<Skeleton className="aspect-video w-full rounded-lg" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('aspect-video', 'w-full', 'rounded-lg')
    })

    it('works as paragraph skeleton', () => {
      render(
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" data-testid="line1" />
          <Skeleton className="h-4 w-full" data-testid="line2" />
          <Skeleton className="h-4 w-3/4" data-testid="line3" />
        </div>
      )
      
      expect(screen.getByTestId('line1')).toHaveClass('h-4', 'w-full')
      expect(screen.getByTestId('line2')).toHaveClass('h-4', 'w-full')
      expect(screen.getByTestId('line3')).toHaveClass('h-4', 'w-3/4')
    })
  })

  describe('Responsive Behavior', () => {
    it('supports responsive width classes', () => {
      render(<Skeleton className="w-full sm:w-1/2 lg:w-1/3" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('w-full', 'sm:w-1/2', 'lg:w-1/3')
    })

    it('supports responsive height classes', () => {
      render(<Skeleton className="h-4 sm:h-6 lg:h-8" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-4', 'sm:h-6', 'lg:h-8')
    })
  })

  describe('Multiple Skeletons', () => {
    it('renders multiple skeletons in a list', () => {
      render(
        <div>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full mb-2" data-testid={`skeleton-${i}`} />
          ))}
        </div>
      )
      
      for (let i = 0; i < 5; i++) {
        expect(screen.getByTestId(`skeleton-${i}`)).toBeInTheDocument()
        expect(screen.getByTestId(`skeleton-${i}`)).toHaveClass('h-4', 'w-full', 'mb-2')
      }
    })

    it('renders skeleton grid layout', () => {
      render(
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" data-testid={`skeleton-${i}`} />
          ))}
        </div>
      )
      
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`skeleton-${i}`)).toBeInTheDocument()
        expect(screen.getByTestId(`skeleton-${i}`)).toHaveClass('h-24', 'w-full')
      }
    })
  })

  describe('Loading States', () => {
    it('can represent different loading states', () => {
      render(
        <div>
          <Skeleton className="h-4 w-full" data-state="loading" data-testid="loading-skeleton" />
          <Skeleton className="h-4 w-full" data-state="error" data-testid="error-skeleton" />
        </div>
      )
      
      expect(screen.getByTestId('loading-skeleton')).toHaveAttribute('data-state', 'loading')
      expect(screen.getByTestId('error-skeleton')).toHaveAttribute('data-state', 'error')
    })
  })

  describe('Edge Cases', () => {
    it('handles zero dimensions gracefully', () => {
      render(<Skeleton className="h-0 w-0" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-0', 'w-0')
      expect(skeleton).toBeInTheDocument()
    })

    it('handles very large dimensions', () => {
      render(<Skeleton className="h-screen w-screen" data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('h-screen', 'w-screen')
    })

    it('works without any additional classes', () => {
      render(<Skeleton data-testid="skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('bg-accent', 'animate-pulse', 'rounded-md')
      expect(skeleton).toBeInTheDocument()
    })

    it('handles complex nested structures', () => {
      render(
        <div>
          <Skeleton className="h-32 w-full mb-4" data-testid="header-skeleton" />
          <div className="flex space-x-4">
            <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" data-testid="avatar-skeleton" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" data-testid="title-skeleton" />
              <Skeleton className="h-3 w-1/2" data-testid="subtitle-skeleton" />
            </div>
          </div>
        </div>
      )
      
      expect(screen.getByTestId('header-skeleton')).toHaveClass('h-32', 'w-full', 'mb-4')
      expect(screen.getByTestId('avatar-skeleton')).toHaveClass('h-20', 'w-20', 'rounded-full')
      expect(screen.getByTestId('title-skeleton')).toHaveClass('h-4', 'w-3/4')
      expect(screen.getByTestId('subtitle-skeleton')).toHaveClass('h-3', 'w-1/2')
    })
  })
})
