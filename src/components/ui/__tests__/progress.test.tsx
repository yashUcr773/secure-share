import { render, screen } from '@testing-library/react'
import { Progress } from '../progress'

describe('Progress', () => {
  describe('Basic Rendering', () => {
    it('renders progress bar', () => {
      render(<Progress value={50} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toBeInTheDocument()
    })

    it('renders with default value of 0', () => {
      render(<Progress aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    })

    it('renders with specified value', () => {
      render(<Progress value={75} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '75')
    })
  })

  describe('Value Handling', () => {
    it('handles value of 0', () => {
      render(<Progress value={0} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(-100%)')
    })

    it('handles value of 100', () => {
      render(<Progress value={100} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '100')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(-0%)')
    })

    it('handles intermediate values', () => {
      render(<Progress value={33} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '33')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(-67%)')
    })

    it('handles undefined value as 0', () => {
      render(<Progress aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(-100%)')
    })

    it('handles null value as 0', () => {
      render(<Progress value={null as any} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(-100%)')
    })
  })

  describe('Edge Cases', () => {
    it('handles values over 100', () => {
      render(<Progress value={150} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '150')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(50%)')
    })

    it('handles negative values', () => {
      render(<Progress value={-25} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '-25')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(-125%)')
    })

    it('handles decimal values', () => {
      render(<Progress value={33.5} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '33.5')
      
      const indicator = progressbar.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveStyle('transform: translateX(-66.5%)')
    })
  })

  describe('Accessibility', () => {
    it('has progressbar role', () => {
      render(<Progress value={50} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toBeInTheDocument()
    })

    it('supports aria-label', () => {
      render(<Progress value={50} aria-label="File upload progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-label', 'File upload progress')
    })

    it('supports aria-labelledby', () => {
      render(
        <div>
          <label id="progress-label">Upload Progress</label>
          <Progress value={50} aria-labelledby="progress-label" />
        </div>
      )
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-labelledby', 'progress-label')
    })

    it('supports aria-describedby', () => {
      render(
        <div>
          <Progress value={50} aria-describedby="progress-desc" aria-label="Progress" />
          <div id="progress-desc">50% complete</div>
        </div>
      )
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-describedby', 'progress-desc')
    })

    it('supports min and max values', () => {
      render(<Progress value={50} min={0} max={200} aria-label="Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '200')
      expect(progressbar).toHaveAttribute('aria-valuenow', '50')
    })

    it('supports aria-valuetext for custom text representation', () => {
      render(
        <Progress 
          value={33.33} 
          aria-valuetext="1 of 3 items processed"
          aria-label="Progress"
        />
      )
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuetext', '1 of 3 items processed')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<Progress value={50} className="custom-progress" data-testid="progress" />)
      
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveClass('custom-progress')
    })

    it('merges className with default classes', () => {
      render(<Progress value={50} className="custom-class" data-testid="progress" />)
      
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveClass('custom-class')
      expect(progress).toHaveClass('relative', 'h-2', 'w-full', 'overflow-hidden', 'rounded-full')
    })

    it('supports inline styles', () => {
      render(
        <Progress 
          value={50} 
          style={{ backgroundColor: 'red' }} 
          data-testid="progress"
          aria-label="Progress"
        />
      )
      
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveStyle('background-color: red')
    })
  })

  describe('Data Attributes', () => {
    it('sets correct data-slot attributes', () => {
      render(<Progress value={50} data-testid="progress" aria-label="Progress" />)
      
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveAttribute('data-slot', 'progress')
      
      const indicator = progress.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveAttribute('data-slot', 'progress-indicator')
    })

    it('supports custom data attributes', () => {
      render(
        <Progress 
          value={50} 
          data-testid="progress"
          data-progress-type="file-upload"
          aria-label="Progress"
        />
      )
      
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveAttribute('data-progress-type', 'file-upload')
    })
  })

  describe('Real-world Usage Patterns', () => {
    it('renders loading progress', () => {
      render(
        <div>
          <label id="loading-label">Loading...</label>
          <Progress value={undefined} aria-labelledby="loading-label" />
        </div>
      )
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    })

    it('renders indeterminate progress', () => {
      render(
        <Progress 
          value={undefined}
          aria-label="Loading"
          className="animate-pulse"
          data-testid="progress"
        />
      )
      
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveClass('animate-pulse')
      expect(progress).toHaveAttribute('aria-valuenow', '0')
    })

    it('renders completed progress', () => {
      render(
        <Progress 
          value={100}
          aria-valuetext="Upload complete"
          aria-label="File upload"
        />
      )
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '100')
      expect(progressbar).toHaveAttribute('aria-valuetext', 'Upload complete')
    })

    it('renders multi-step progress', () => {
      const currentStep = 2
      const totalSteps = 5
      const progressValue = (currentStep / totalSteps) * 100
      
      render(
        <Progress 
          value={progressValue}
          aria-valuetext={`Step ${currentStep} of ${totalSteps}`}
          aria-label="Form progress"
        />
      )
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '40')
      expect(progressbar).toHaveAttribute('aria-valuetext', 'Step 2 of 5')
    })
  })

  describe('Animation Support', () => {
    it('has transition classes on indicator', () => {
      render(<Progress value={50} data-testid="progress" aria-label="Progress" />)
      
      const progress = screen.getByTestId('progress')
      const indicator = progress.querySelector('[data-slot="progress-indicator"]')
      expect(indicator).toHaveClass('transition-all')
    })

    it('supports disabled animations', () => {
      render(
        <Progress 
          value={50}
          className="motion-reduce:transition-none"
          data-testid="progress"
          aria-label="Progress"
        />
      )
      
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveClass('motion-reduce:transition-none')
    })
  })
})
