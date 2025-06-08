import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Label } from '../label'

describe('Label', () => {
  describe('Basic Rendering', () => {
    it('renders label with default props', () => {
      render(<Label data-testid="label">Label Text</Label>)
      
      const label = screen.getByTestId('label')
      expect(label).toBeInTheDocument()
      expect(label).toHaveTextContent('Label Text')
      expect(label.tagName).toBe('LABEL')
    })

    it('renders with correct default classes', () => {
      render(<Label>Label Text</Label>)
      
      const label = screen.getByText('Label Text')
      expect(label).toHaveClass(
        'text-sm',
        'font-medium',
        'leading-none',
        'peer-disabled:cursor-not-allowed',
        'peer-disabled:opacity-70'
      )
    })

    it('forwards ref correctly', () => {
      const ref = { current: null }
      render(<Label ref={ref}>Label Text</Label>)
      
      expect(ref.current).toBeInstanceOf(HTMLLabelElement)
    })
  })

  describe('HTML Attributes', () => {
    it('supports htmlFor attribute', () => {
      render(<Label htmlFor="input-id">Label Text</Label>)
      
      const label = screen.getByText('Label Text')
      expect(label).toHaveAttribute('for', 'input-id')
    })

    it('supports form attributes', () => {
      render(<Label form="form-id">Label Text</Label>)
      
      const label = screen.getByText('Label Text')
      expect(label).toHaveAttribute('form', 'form-id')
    })

    it('supports data attributes', () => {
      render(
        <Label 
          data-testid="test-label" 
          data-field="username"
          data-required="true"
        >
          Username
        </Label>
      )
      
      const label = screen.getByTestId('test-label')
      expect(label).toHaveAttribute('data-field', 'username')
      expect(label).toHaveAttribute('data-required', 'true')
    })

    it('supports aria attributes', () => {
      render(
        <Label 
          aria-label="Username field label"
          aria-describedby="username-help"
        >
          Username
        </Label>
      )
      
      const label = screen.getByText('Username')
      expect(label).toHaveAttribute('aria-label', 'Username field label')
      expect(label).toHaveAttribute('aria-describedby', 'username-help')
    })
  })

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(<Label className="custom-label text-blue-500">Label Text</Label>)
      
      const label = screen.getByText('Label Text')
      expect(label).toHaveClass('custom-label', 'text-blue-500')
    })

    it('merges custom classes with default classes', () => {
      render(<Label className="text-lg font-bold">Label Text</Label>)
      
      const label = screen.getByText('Label Text')
      expect(label).toHaveClass('text-sm', 'font-medium', 'text-lg', 'font-bold')
    })

    it('applies theme-specific styles', () => {
      render(<Label className="text-gray-700 dark:text-gray-300">Label Text</Label>)
      
      const label = screen.getByText('Label Text')
      expect(label).toHaveClass('text-gray-700', 'dark:text-gray-300')
    })

    it('supports variant styles', () => {
      render(<Label className="text-red-500 font-semibold">Error Label</Label>)
      
      const label = screen.getByText('Error Label')
      expect(label).toHaveClass('text-red-500', 'font-semibold')
    })
  })

  describe('Form Integration', () => {
    it('associates with input using htmlFor', () => {
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <input id="username" type="text" />
        </div>
      )
      
      const label = screen.getByText('Username')
      const input = screen.getByRole('textbox')
      
      expect(label).toHaveAttribute('for', 'username')
      expect(input).toHaveAttribute('id', 'username')
    })

    it('associates with input by wrapping', () => {
      render(
        <Label>
          Email
          <input type="email" />
        </Label>
      )
      
      const label = screen.getByText('Email')
      const input = screen.getByRole('textbox')
      
      expect(label).toContainElement(input)
    })

    it('works with checkbox inputs', () => {
      render(
        <Label htmlFor="terms">
          <input id="terms" type="checkbox" />
          I agree to the terms and conditions
        </Label>
      )
      
      const label = screen.getByText(/i agree to the terms/i)
      const checkbox = screen.getByRole('checkbox')
      
      expect(label).toHaveAttribute('for', 'terms')
      expect(checkbox).toHaveAttribute('id', 'terms')
    })

    it('works with radio inputs', () => {
      render(
        <div>
          <Label htmlFor="option1">
            <input id="option1" type="radio" name="options" value="1" />
            Option 1
          </Label>
          <Label htmlFor="option2">
            <input id="option2" type="radio" name="options" value="2" />
            Option 2
          </Label>
        </div>
      )
      
      const label1 = screen.getByText('Option 1')
      const label2 = screen.getByText('Option 2')
      const radios = screen.getAllByRole('radio')
      
      expect(label1).toHaveAttribute('for', 'option1')
      expect(label2).toHaveAttribute('for', 'option2')
      expect(radios).toHaveLength(2)
    })
  })

  describe('Accessibility', () => {
    it('supports screen readers', () => {
      render(
        <div>
          <Label htmlFor="password">Password</Label>
          <input id="password" type="password" />
        </div>
      )
      
      const input = screen.getByLabelText('Password')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'password')
    })

    it('supports required field indication', () => {
      render(
        <Label htmlFor="email" className="after:content-['*'] after:text-red-500">
          Email
        </Label>
      )
      
      const label = screen.getByText('Email')
      expect(label).toHaveClass('after:content-[\'*\']', 'after:text-red-500')
    })

    it('supports disabled state styling', () => {
      render(
        <div>
          <Label htmlFor="disabled-input">Disabled Field</Label>
          <input id="disabled-input" disabled className="peer" />
        </div>
      )
      
      const label = screen.getByText('Disabled Field')
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70')
    })
  })

  describe('User Interaction', () => {
    it('clicking label focuses associated input', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Label htmlFor="clickable-input">Click me</Label>
          <input id="clickable-input" type="text" />
        </div>
      )
      
      const label = screen.getByText('Click me')
      const input = screen.getByRole('textbox')
      
      await user.click(label)
      expect(input).toHaveFocus()
    })

    it('clicking label toggles checkbox', async () => {
      const user = userEvent.setup()
      
      render(
        <Label htmlFor="toggle-checkbox">
          <input id="toggle-checkbox" type="checkbox" />
          Toggle me
        </Label>
      )
      
      const label = screen.getByText('Toggle me')
      const checkbox = screen.getByRole('checkbox')
      
      expect(checkbox).not.toBeChecked()
      
      await user.click(label)
      expect(checkbox).toBeChecked()
      
      await user.click(label)
      expect(checkbox).not.toBeChecked()
    })

    it('clicking label selects radio button', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Label htmlFor="radio1">
            <input id="radio1" type="radio" name="test" value="1" />
            Option 1
          </Label>
          <Label htmlFor="radio2">
            <input id="radio2" type="radio" name="test" value="2" />
            Option 2
          </Label>
        </div>
      )
      
      const label1 = screen.getByText('Option 1')
      const label2 = screen.getByText('Option 2')
      const radio1 = screen.getByDisplayValue('1')
      const radio2 = screen.getByDisplayValue('2')
      
      await user.click(label1)
      expect(radio1).toBeChecked()
      expect(radio2).not.toBeChecked()
      
      await user.click(label2)
      expect(radio1).not.toBeChecked()
      expect(radio2).toBeChecked()
    })
  })

  describe('Complex Layouts', () => {
    it('works in grid layouts', () => {
      render(
        <div className="grid grid-cols-2 gap-4">
          <Label htmlFor="firstName">First Name</Label>
          <input id="firstName" type="text" />
          
          <Label htmlFor="lastName">Last Name</Label>
          <input id="lastName" type="text" />
          
          <Label htmlFor="email" className="col-span-2">Email Address</Label>
          <input id="email" type="email" className="col-span-2" />
        </div>
      )
      
      expect(screen.getByText('First Name')).toBeInTheDocument()
      expect(screen.getByText('Last Name')).toBeInTheDocument()
      expect(screen.getByText('Email Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toHaveClass('col-span-2')
    })

    it('works in flex layouts', () => {
      render(
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="inline-input" className="w-24">Name:</Label>
            <input id="inline-input" type="text" className="flex-1" />
          </div>
          
          <div className="flex items-start gap-2">
            <Label htmlFor="textarea" className="w-24 pt-1">Message:</Label>
            <textarea id="textarea" className="flex-1" />
          </div>
        </div>
      )
      
      expect(screen.getByText('Name:')).toHaveClass('w-24')
      expect(screen.getByText('Message:')).toHaveClass('w-24', 'pt-1')
    })

    it('works with field groups', () => {
      render(
        <fieldset>
          <legend>Contact Information</legend>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <input id="phone" type="tel" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <textarea id="address" />
          </div>
        </fieldset>
      )
      
      expect(screen.getByText('Contact Information')).toBeInTheDocument()
      expect(screen.getByLabelText('Phone Number')).toHaveAttribute('type', 'tel')
      expect(screen.getByLabelText('Address')).toBeInTheDocument()
    })
  })

  describe('Common Usage Patterns', () => {
    it('works as form field label with validation', () => {
      render(
        <div>
          <Label htmlFor="required-field" className="flex items-center gap-1">
            Required Field
            <span className="text-red-500">*</span>
          </Label>
          <input 
            id="required-field" 
            type="text" 
            required 
            aria-describedby="field-error"
          />
          <div id="field-error" className="text-red-500 text-sm">
            This field is required
          </div>
        </div>
      )
      
      const label = screen.getByText('Required Field')
      const asterisk = screen.getByText('*')
      const input = screen.getByRole('textbox')
      const error = screen.getByText('This field is required')
      
      expect(label).toBeInTheDocument()
      expect(asterisk).toHaveClass('text-red-500')
      expect(input).toHaveAttribute('aria-describedby', 'field-error')
      expect(error).toBeInTheDocument()
    })

    it('works as toggle switch label', () => {
      render(
        <Label htmlFor="toggle-switch" className="flex items-center gap-2 cursor-pointer">
          <input 
            id="toggle-switch" 
            type="checkbox" 
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-500"></div>
          Enable notifications
        </Label>
      )
      
      const label = screen.getByText('Enable notifications')
      const checkbox = screen.getByRole('checkbox')
      
      expect(label).toHaveClass('cursor-pointer')
      expect(checkbox).toHaveClass('sr-only', 'peer')
    })

    it('works with file input', () => {
      render(
        <Label htmlFor="file-upload" className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded">
          Choose File
          <input id="file-upload" type="file" className="sr-only" />
        </Label>
      )
      
      const label = screen.getByText('Choose File')
      const fileInput = screen.getByLabelText('Choose File')
      
      expect(label).toHaveClass('cursor-pointer', 'bg-blue-500')
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveClass('sr-only')
    })

    it('works with search input', () => {
      render(
        <div className="relative">
          <Label htmlFor="search" className="sr-only">Search</Label>
          <input 
            id="search" 
            type="search" 
            placeholder="Search..."
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            🔍
          </div>
        </div>
      )
      
      const label = screen.getByText('Search')
      const input = screen.getByRole('searchbox')
      
      expect(label).toHaveClass('sr-only')
      expect(input).toHaveAttribute('placeholder', 'Search...')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty label text', () => {
      render(<Label htmlFor="empty-label"></Label>)
      
      const label = screen.getByRole('generic')
      expect(label).toBeInTheDocument()
      expect(label).toHaveAttribute('for', 'empty-label')
    })

    it('handles very long label text', () => {
      const longText = 'This is a very long label text that might wrap to multiple lines in the UI and should be handled gracefully by the component'
      
      render(<Label>{longText}</Label>)
      
      const label = screen.getByText(longText)
      expect(label).toBeInTheDocument()
      expect(label).toHaveTextContent(longText)
    })

    it('handles special characters in label text', () => {
      render(<Label>Label with special chars: @#$%^&*()_+</Label>)
      
      const label = screen.getByText('Label with special chars: @#$%^&*()_+')
      expect(label).toBeInTheDocument()
    })

    it('handles HTML entities', () => {
      render(<Label>Price: &lt; $100 &amp; &gt; $50</Label>)
      
      const label = screen.getByText('Price: < $100 & > $50')
      expect(label).toBeInTheDocument()
    })

    it('handles nested elements', () => {
      render(
        <Label htmlFor="nested">
          <span className="font-bold">Important:</span>
          <span className="text-gray-500"> Optional field</span>
        </Label>
      )
      
      const label = screen.getByText(/important:/i)
      expect(label).toBeInTheDocument()
      expect(screen.getByText('Important:')).toHaveClass('font-bold')
      expect(screen.getByText(' Optional field')).toHaveClass('text-gray-500')
    })
  })

  describe('Responsive Design', () => {
    it('handles responsive text sizes', () => {
      render(<Label className="text-xs sm:text-sm md:text-base">Responsive Label</Label>)
      
      const label = screen.getByText('Responsive Label')
      expect(label).toHaveClass('text-xs', 'sm:text-sm', 'md:text-base')
    })

    it('handles responsive layouts', () => {
      render(
        <Label className="block sm:inline-block md:flex md:items-center">
          <span className="block sm:inline">Field Name:</span>
          <span className="block sm:inline sm:ml-2">Required</span>
        </Label>
      )
      
      const label = screen.getByText(/field name/i)
      expect(label).toHaveClass('block', 'sm:inline-block', 'md:flex', 'md:items-center')
    })
  })
})
