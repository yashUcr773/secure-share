import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Badge } from '../badge'
import { Star, Check, X } from 'lucide-react'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Star: () => <div data-testid="star-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />
}))

describe('Badge', () => {
  describe('Basic Rendering', () => {
    it('renders badge with text content', () => {
      render(<Badge>Test Badge</Badge>)
      
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('renders as span by default', () => {
      render(<Badge data-testid="badge">Default Badge</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge.tagName).toBe('SPAN')
    })

    it('renders with icon', () => {
      render(
        <Badge>
          <Star />
          Featured
        </Badge>
      )
      
      expect(screen.getByTestId('star-icon')).toBeInTheDocument()
      expect(screen.getByText('Featured')).toBeInTheDocument()
    })

    it('renders empty badge', () => {
      render(<Badge data-testid="empty-badge" />)
      
      const badge = screen.getByTestId('empty-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('')
    })
  })

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Badge data-testid="badge">Default</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('renders secondary variant', () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground')
    })

    it('renders destructive variant', () => {
      render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-destructive', 'text-white')
    })

    it('renders outline variant', () => {
      render(<Badge variant="outline" data-testid="badge">Outline</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('AsChild Prop', () => {
    it('renders as child component when asChild is true', () => {
      render(
        <Badge asChild data-testid="badge">
          <button>Button Badge</button>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge.tagName).toBe('BUTTON')
      expect(badge).toHaveTextContent('Button Badge')
    })

    it('renders as link when asChild is true', () => {
      render(
        <Badge asChild data-testid="badge">
          <a href="/test">Link Badge</a>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge.tagName).toBe('A')
      expect(badge).toHaveAttribute('href', '/test')
      expect(badge).toHaveTextContent('Link Badge')
    })

    it('applies badge classes to child component', () => {
      render(
        <Badge asChild variant="destructive" data-testid="badge">
          <button>Button Badge</button>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-destructive', 'text-white')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<Badge className="custom-badge" data-testid="badge">Custom</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('custom-badge')
    })

    it('merges className with default classes', () => {
      render(<Badge className="custom-class" data-testid="badge">Badge</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('custom-class')
      expect(badge).toHaveClass('inline-flex', 'items-center', 'justify-center', 'rounded-md')
    })

    it('supports inline styles', () => {
      render(
        <Badge style={{ backgroundColor: 'purple' }} data-testid="badge">
          Styled Badge
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveStyle('background-color: purple')
    })
  })

  describe('Interactive Badges', () => {
    it('handles click events when rendered as button', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      
      render(
        <Badge asChild>
          <button onClick={handleClick} data-testid="badge">
            Clickable Badge
          </button>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      await user.click(badge)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('handles keyboard events when rendered as button', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      
      render(
        <Badge asChild>
          <button onClick={handleClick} data-testid="badge">
            Keyboard Badge
          </button>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      badge.focus()
      await user.keyboard('{Enter}')
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('supports focus when rendered as link', () => {
      render(
        <Badge asChild>
          <a href="/test" data-testid="badge">
            Link Badge
          </a>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      badge.focus()
      expect(badge).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('supports aria attributes', () => {
      render(
        <Badge aria-label="Status badge" data-testid="badge">
          Active
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('aria-label', 'Status badge')
    })

    it('supports role attribute', () => {
      render(
        <Badge role="status" data-testid="badge">
          Loading...
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('role', 'status')
    })

    it('supports aria-describedby', () => {
      render(
        <div>
          <Badge aria-describedby="badge-desc" data-testid="badge">
            Important
          </Badge>
          <div id="badge-desc">This badge indicates importance</div>
        </div>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('aria-describedby', 'badge-desc')
    })

    it('supports tabIndex when interactive', () => {
      render(
        <Badge asChild>
          <button tabIndex={0} data-testid="badge">
            Focusable Badge
          </button>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Data Attributes', () => {
    it('sets correct data-slot attribute', () => {
      render(<Badge data-testid="badge">Test</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('data-slot', 'badge')
    })

    it('supports custom data attributes', () => {
      render(
        <Badge data-badge-type="status" data-testid="badge">
          Status Badge
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('data-badge-type', 'status')
    })
  })

  describe('Content Types', () => {
    it('renders with text only', () => {
      render(<Badge>Text Badge</Badge>)
      
      expect(screen.getByText('Text Badge')).toBeInTheDocument()
    })

    it('renders with icon only', () => {
      render(
        <Badge>
          <Check />
        </Badge>
      )
      
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })

    it('renders with icon and text', () => {
      render(
        <Badge>
          <Check />
          Verified
        </Badge>
      )
      
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getByText('Verified')).toBeInTheDocument()
    })

    it('renders with multiple icons', () => {
      render(
        <Badge>
          <Star />
          <Check />
          Premium
        </Badge>
      )
      
      expect(screen.getByTestId('star-icon')).toBeInTheDocument()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getByText('Premium')).toBeInTheDocument()
    })

    it('renders with number content', () => {
      render(<Badge>{42}</Badge>)
      
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  describe('Common Usage Patterns', () => {
    it('renders status badge', () => {
      render(
        <Badge variant="secondary" data-testid="badge">
          <Check />
          Completed
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-secondary')
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('renders error badge', () => {
      render(
        <Badge variant="destructive" data-testid="badge">
          <X />
          Error
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-destructive')
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('renders notification count badge', () => {
      render(
        <Badge variant="destructive" className="absolute -top-2 -right-2">
          5
        </Badge>
      )
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders dismissible badge', async () => {
      const user = userEvent.setup()
      const onDismiss = jest.fn()
      
      render(
        <Badge className="pr-1">
          Feature
          <button onClick={onDismiss} className="ml-1 hover:bg-white/20 rounded">
            <X />
          </button>
        </Badge>
      )
      
      const dismissButton = screen.getByRole('button')
      await user.click(dismissButton)
      
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('renders link badge', () => {
      render(
        <Badge asChild variant="outline">
          <a href="/category" data-testid="badge">
            Category
          </a>
        </Badge>
      )
      
      const badge = screen.getByTestId('badge')
      expect(badge.tagName).toBe('A')
      expect(badge).toHaveAttribute('href', '/category')
      expect(badge).toHaveTextContent('Category')
    })
  })

  describe('Edge Cases', () => {
    it('handles very long text', () => {
      const longText = 'This is a very long badge text that should be handled gracefully'
      render(<Badge>{longText}</Badge>)
      
      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('handles special characters', () => {
      render(<Badge>Badge with !@#$%^&*() characters</Badge>)
      
      expect(screen.getByText('Badge with !@#$%^&*() characters')).toBeInTheDocument()
    })

    it('handles empty string content', () => {
      render(<Badge data-testid="badge">{''}</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveTextContent('')
    })

    it('handles zero as content', () => {
      render(<Badge>{0}</Badge>)
      
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })
})
