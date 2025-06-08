import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '../alert'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />
}))

describe('Alert', () => {
  describe('Basic Rendering', () => {
    it('renders alert with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
          <AlertDescription>This is an alert description</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Alert Title')).toBeInTheDocument()
      expect(screen.getByText('This is an alert description')).toBeInTheDocument()
    })

    it('renders alert with only title', () => {
      render(
        <Alert>
          <AlertTitle>Just a title</AlertTitle>
        </Alert>
      )
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Just a title')).toBeInTheDocument()
    })

    it('renders alert with only description', () => {
      render(
        <Alert>
          <AlertDescription>Just a description</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Just a description')).toBeInTheDocument()
    })

    it('renders alert with icon', () => {
      render(
        <Alert>
          <Info />
          <AlertTitle>Info Alert</AlertTitle>
          <AlertDescription>This is an informational alert</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
      expect(screen.getByText('Info Alert')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('renders default variant', () => {
      render(
        <Alert data-testid="alert">
          <AlertTitle>Default Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByTestId('alert')
      expect(alert).toHaveClass('bg-card', 'text-card-foreground')
    })

    it('renders destructive variant', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          <AlertTitle>Error Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByTestId('alert')
      expect(alert).toHaveClass('text-destructive', 'bg-card')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className to alert', () => {
      render(
        <Alert className="custom-alert" data-testid="alert">
          <AlertTitle>Custom Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByTestId('alert')
      expect(alert).toHaveClass('custom-alert')
    })

    it('applies custom className to title', () => {
      render(
        <Alert>
          <AlertTitle className="custom-title" data-testid="title">
            Custom Title
          </AlertTitle>
        </Alert>
      )
      
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('custom-title')
    })

    it('applies custom className to description', () => {
      render(
        <Alert>
          <AlertDescription className="custom-description" data-testid="description">
            Custom Description
          </AlertDescription>
        </Alert>
      )
      
      const description = screen.getByTestId('description')
      expect(description).toHaveClass('custom-description')
    })
  })

  describe('Accessibility', () => {
    it('has role="alert" for accessibility', () => {
      render(
        <Alert>
          <AlertTitle>Accessible Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('supports aria-describedby', () => {
      render(
        <Alert aria-describedby="alert-desc">
          <AlertTitle>Alert with Description</AlertTitle>
          <AlertDescription id="alert-desc">
            This description is referenced by aria-describedby
          </AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-describedby', 'alert-desc')
    })

    it('supports custom aria-label', () => {
      render(
        <Alert aria-label="Custom alert label">
          <AlertTitle>Alert Title</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-label', 'Custom alert label')
    })
  })

  describe('Data Attributes', () => {
    it('sets correct data-slot attributes', () => {
      render(
        <Alert data-testid="alert">
          <AlertTitle data-testid="title">Title</AlertTitle>
          <AlertDescription data-testid="description">Description</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByTestId('alert')).toHaveAttribute('data-slot', 'alert')
      expect(screen.getByTestId('title')).toHaveAttribute('data-slot', 'alert-title')
      expect(screen.getByTestId('description')).toHaveAttribute('data-slot', 'alert-description')
    })
  })

  describe('Content Types', () => {
    it('renders with JSX content in description', () => {
      render(
        <Alert>
          <AlertTitle>Rich Content Alert</AlertTitle>
          <AlertDescription>
            <p>First paragraph</p>
            <p>Second paragraph with <strong>bold text</strong></p>
          </AlertDescription>
        </Alert>
      )
      
      expect(screen.getByText('First paragraph')).toBeInTheDocument()
      expect(screen.getByText('bold text')).toBeInTheDocument()
    })

    it('renders with links in description', () => {
      render(
        <Alert>
          <AlertTitle>Alert with Link</AlertTitle>
          <AlertDescription>
            Please visit <a href="https://example.com">our website</a> for more info.
          </AlertDescription>
        </Alert>
      )
      
      const link = screen.getByRole('link', { name: 'our website' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com')
    })
  })

  describe('Common Alert Patterns', () => {
    it('renders success alert pattern', () => {
      render(
        <Alert>
          <CheckCircle />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your action was completed successfully.</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
      expect(screen.getByText('Success')).toBeInTheDocument()
      expect(screen.getByText('Your action was completed successfully.')).toBeInTheDocument()
    })

    it('renders error alert pattern', () => {
      render(
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong. Please try again.</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })

    it('renders warning alert pattern', () => {
      render(
        <Alert>
          <AlertTriangle />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>This action cannot be undone.</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
      expect(screen.getByText('Warning')).toBeInTheDocument()
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
    })

    it('renders info alert pattern', () => {
      render(
        <Alert>
          <Info />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>Here&apos;s some helpful information for you.</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
      expect(screen.getByText('Information')).toBeInTheDocument()
      expect(screen.getByText("Here's some helpful information for you.")).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('renders empty alert', () => {
      render(<Alert data-testid="empty-alert" />)
      
      const alert = screen.getByTestId('empty-alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent('')
    })

    it('renders with very long content', () => {
      const longText = 'This is a very long alert description that should wrap properly and maintain readability even with extensive content. '.repeat(5)
      
      render(
        <Alert>
          <AlertTitle>Long Content Alert</AlertTitle>
          <AlertDescription>{longText}</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByText('Long Content Alert')).toBeInTheDocument()
      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('handles special characters in content', () => {
      render(
        <Alert>
          <AlertTitle>Special Characters: !@#$%^&*()</AlertTitle>
          <AlertDescription>&lt;script&gt;alert(&apos;xss&apos;)&lt;/script&gt;</AlertDescription>
        </Alert>
      )
      
      expect(screen.getByText('Special Characters: !@#$%^&*()')).toBeInTheDocument()
      expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument()
    })
  })
})
