import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator
} from '../select'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckIcon: () => <div data-testid="check-icon" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  ChevronUpIcon: () => <div data-testid="chevron-up-icon" />
}))

const SelectExample = ({ value = '', onValueChange = jest.fn(), disabled = false }) => (
  <Select value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger data-testid="select-trigger">
      <SelectValue placeholder="Select an option..." />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Fruits</SelectLabel>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
        <SelectSeparator />
        <SelectItem value="grape" disabled>Grape (disabled)</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
)

describe('Select', () => {
  describe('Rendering', () => {
    it('renders select trigger with placeholder', () => {
      render(<SelectExample />)
      
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Select an option...')).toBeInTheDocument()
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument()
    })

    it('renders with selected value', () => {
      render(<SelectExample value="apple" />)
      
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
    })

    it('renders in disabled state', () => {
      render(<SelectExample disabled />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
    })
  })

  describe('Trigger Variants', () => {
    it('renders default size trigger', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )
      
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveAttribute('data-size', 'default')
    })

    it('renders small size trigger', () => {
      render(
        <Select>
          <SelectTrigger size="sm" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )
      
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveAttribute('data-size', 'sm')
    })

    it('applies custom className to trigger', () => {
      render(
        <Select>
          <SelectTrigger className="custom-class" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )
      
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveClass('custom-class')
    })
  })

  describe('User Interaction', () => {
    it('opens select when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(<SelectExample />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
      
      // Check that options are visible
      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Orange' })).toBeInTheDocument()
    })

    it('selects option when clicked', async () => {
      const user = userEvent.setup()
      const onValueChange = jest.fn()
      render(<SelectExample onValueChange={onValueChange} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('option', { name: 'Apple' }))
      
      expect(onValueChange).toHaveBeenCalledWith('apple')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const onValueChange = jest.fn()
      render(<SelectExample onValueChange={onValueChange} />)
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      
      // Open with Enter
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      expect(onValueChange).toHaveBeenCalled()
    })

    it('closes when escape is pressed', async () => {
      const user = userEvent.setup()
      render(<SelectExample />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('does not open when disabled', async () => {
      const user = userEvent.setup()
      render(<SelectExample disabled />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Select Content', () => {
    it('renders select groups and labels', async () => {
      const user = userEvent.setup()
      render(<SelectExample />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText('Fruits')).toBeInTheDocument()
      })
    })

    it('renders disabled options correctly', async () => {
      const user = userEvent.setup()
      render(<SelectExample />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        const disabledOption = screen.getByRole('option', { name: 'Grape (disabled)' })
        expect(disabledOption).toBeInTheDocument()
        expect(disabledOption).toHaveAttribute('data-disabled')
      })
    })

    it('shows check icon for selected option', async () => {
      const user = userEvent.setup()
      render(<SelectExample value="apple" />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        const selectedOption = screen.getByRole('option', { name: 'Apple' })
        expect(selectedOption).toHaveAttribute('data-state', 'checked')
      })
    })

    it('renders separator correctly', async () => {
      const user = userEvent.setup()
      render(<SelectExample />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        const separator = screen.getByRole('separator')
        expect(separator).toBeInTheDocument()
        expect(separator).toHaveAttribute('data-slot', 'select-separator')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<SelectExample />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    })

    it('supports ARIA labelling', () => {
      render(
        <div>
          <label id="select-label">Choose fruit</label>
          <Select>
            <SelectTrigger aria-labelledby="select-label">
              <SelectValue />
            </SelectTrigger>
          </Select>
        </div>
      )
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-labelledby', 'select-label')
    })

    it('announces selected value to screen readers', () => {
      render(<SelectExample value="apple" />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAccessibleName()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className to content', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="custom-content">
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      )
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('listbox')
        expect(content).toHaveClass('custom-content')
      })
    })

    it('applies custom className to items', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test" className="custom-item">
              Test Item
            </SelectItem>
          </SelectContent>
        </Select>
      )
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        const item = screen.getByRole('option', { name: 'Test Item' })
        expect(item).toHaveClass('custom-item')
      })
    })

    it('applies custom className to label', async () => {
      const user = userEvent.setup()
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectLabel className="custom-label">Custom Label</SelectLabel>
          </SelectContent>
        </Select>
      )
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      await waitFor(() => {
        const label = screen.getByText('Custom Label')
        expect(label).toHaveClass('custom-label')
      })
    })
  })

  describe('Data Attributes', () => {
    it('sets correct data-slot attributes', async () => {
      const user = userEvent.setup()
      render(<SelectExample />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
      
      await user.click(trigger)
      
      await waitFor(() => {
        const content = screen.getByRole('listbox')
        expect(content).toHaveAttribute('data-slot', 'select-content')
        
        const items = screen.getAllByRole('option')
        items.forEach(item => {
          expect(item).toHaveAttribute('data-slot', 'select-item')
        })
      })
    })

    it('sets data-size attribute on trigger', () => {
      render(
        <Select>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('data-size', 'sm')
    })
  })
})
