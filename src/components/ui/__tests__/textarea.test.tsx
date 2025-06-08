import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '../textarea'

describe('Textarea', () => {
  describe('Basic Rendering', () => {
    it('renders textarea with default classes', () => {
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveClass(
        'border-input',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring',
        'flex',
        'min-h-16',
        'w-full',
        'rounded-md',
        'border',
        'bg-transparent',
        'px-3',
        'py-2',
        'text-base',
        'shadow-xs'
      )
    })

    it('merges custom className with default classes', () => {
      render(<Textarea className="custom-textarea" data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveClass('custom-textarea')
      expect(textarea).toHaveClass('flex', 'min-h-16', 'w-full', 'rounded-md')
    })

    it('forwards all props to textarea element', () => {
      render(
        <Textarea
          data-testid="textarea"
          placeholder="Enter your message"
          rows={5}
          cols={50}
          required
          maxLength={500}
          aria-label="Message input"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveAttribute('placeholder', 'Enter your message')
      expect(textarea).toHaveAttribute('rows', '5')
      expect(textarea).toHaveAttribute('cols', '50')
      expect(textarea).toHaveAttribute('maxLength', '500')
      expect(textarea).toHaveAttribute('aria-label', 'Message input')
      expect(textarea).toBeRequired()
    })
  })

  describe('Interaction', () => {
    it('handles user input correctly', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      
      render(<Textarea onChange={handleChange} data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, 'Hello world!')
      
      expect(textarea).toHaveValue('Hello world!')
      expect(handleChange).toHaveBeenCalled()
    })

    it('handles focus and blur events', async () => {
      const user = userEvent.setup()
      const handleFocus = jest.fn()
      const handleBlur = jest.fn()
      
      render(
        <Textarea
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-testid="textarea"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      
      await user.click(textarea)
      expect(handleFocus).toHaveBeenCalled()
      
      await user.tab()
      expect(handleBlur).toHaveBeenCalled()
    })

    it('handles keyboard events', async () => {
      const user = userEvent.setup()
      const handleKeyDown = jest.fn()
      const handleKeyUp = jest.fn()
      
      render(
        <Textarea
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          data-testid="textarea"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, 'a')
      
      expect(handleKeyDown).toHaveBeenCalled()
      expect(handleKeyUp).toHaveBeenCalled()
    })
  })

  describe('Disabled State', () => {
    it('handles disabled state correctly', () => {
      render(<Textarea disabled data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toBeDisabled()
      expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    })

    it('prevents input when disabled', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      
      render(<Textarea disabled onChange={handleChange} data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, 'test')
      
      expect(textarea).toHaveValue('')
      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('Controlled Component', () => {
    it('works as controlled component', () => {
      const { rerender } = render(
        <Textarea value="initial" data-testid="textarea" readOnly />
      )
      
      let textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveValue('initial')
      
      rerender(<Textarea value="updated" data-testid="textarea" readOnly />)
      
      textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveValue('updated')
    })
  })

  describe('Accessibility', () => {
    it('supports aria attributes', () => {
      render(
        <Textarea
          data-testid="textarea"
          aria-label="Message input"
          aria-describedby="textarea-help"
          aria-required="true"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveAttribute('aria-label', 'Message input')
      expect(textarea).toHaveAttribute('aria-describedby', 'textarea-help')
      expect(textarea).toHaveAttribute('aria-required', 'true')
    })

    it('maintains accessibility with proper labeling', () => {
      render(
        <div>
          <label htmlFor="message-textarea">Message</label>
          <Textarea id="message-textarea" />
        </div>
      )
      
      const textarea = screen.getByLabelText('Message')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('id', 'message-textarea')
    })
  })

  describe('Data Attributes', () => {
    it('sets correct data-slot attribute', () => {
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveAttribute('data-slot', 'textarea')
    })

    it('supports custom data attributes', () => {
      render(
        <Textarea
          data-testid="textarea"
          data-textarea-type="message"
          data-resize="vertical"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveAttribute('data-textarea-type', 'message')
      expect(textarea).toHaveAttribute('data-resize', 'vertical')
    })
  })

  describe('Styling', () => {
    it('applies focus styles', () => {
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-ring/50',
        'focus-visible:ring-[3px]'
      )
    })

    it('applies error styles', () => {
      render(<Textarea aria-invalid={true} data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveClass(
        'aria-invalid:ring-destructive/20',
        'aria-invalid:border-destructive'
      )
    })

    it('supports inline styles', () => {
      render(
        <Textarea
          style={{ backgroundColor: 'lightblue', minHeight: '200px' }}
          data-testid="textarea"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveStyle('background-color: lightblue')
      expect(textarea).toHaveStyle('min-height: 200px')
    })
  })

  describe('Responsive Behavior', () => {
    it('applies responsive text sizing', () => {
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveClass('text-base', 'md:text-sm')
    })
  })

  describe('Content Sizing', () => {
    it('applies field-sizing-content for automatic height adjustment', () => {
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveClass('field-sizing-content')
    })

    it('respects custom rows attribute', () => {
      render(<Textarea rows={10} data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveAttribute('rows', '10')
    })
  })

  describe('Edge Cases', () => {
    it('handles very long text input', async () => {
      const user = userEvent.setup()
      const longText = 'This is a very long text input that should be handled properly. '.repeat(20)
      
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, longText)
      
      expect(textarea).toHaveValue(longText)
    })

    it('handles special characters', async () => {
      const user = userEvent.setup()
      const specialText = 'Special chars: !@#$%^&*()[]{}|\\:";\'<>?,./`~'
      
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, specialText)
      
      expect(textarea).toHaveValue(specialText)
    })

    it('handles multiline text', async () => {
      const user = userEvent.setup()
      const multilineText = 'Line 1\nLine 2\nLine 3'
      
      render(<Textarea data-testid="textarea" />)
      
      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, multilineText)
      
      expect(textarea).toHaveValue(multilineText)
    })

    it('handles empty value', () => {
      render(<Textarea value="" data-testid="textarea" readOnly />)
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveValue('')
    })
  })

  describe('Common Usage Patterns', () => {
    it('works as a message input field', () => {
      render(
        <Textarea
          placeholder="Enter your message..."
          rows={4}
          maxLength={500}
          required
          aria-label="Message input"
          data-testid="textarea"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveAttribute('placeholder', 'Enter your message...')
      expect(textarea).toHaveAttribute('rows', '4')
      expect(textarea).toHaveAttribute('maxLength', '500')
      expect(textarea).toBeRequired()
    })

    it('works as a description field', () => {
      render(
        <div>
          <label htmlFor="description">Description</label>
          <Textarea
            id="description"
            placeholder="Describe your project..."
            rows={6}
          />
        </div>
      )
      
      const textarea = screen.getByLabelText('Description')
      expect(textarea).toHaveAttribute('placeholder', 'Describe your project...')
      expect(textarea).toHaveAttribute('rows', '6')
    })

    it('works as a comment field', () => {
      render(
        <Textarea
          placeholder="Leave a comment..."
          maxLength={1000}
          aria-describedby="comment-help"
          data-testid="textarea"
        />
      )
      
      const textarea = screen.getByTestId('textarea')
      expect(textarea).toHaveAttribute('placeholder', 'Leave a comment...')
      expect(textarea).toHaveAttribute('maxLength', '1000')
      expect(textarea).toHaveAttribute('aria-describedby', 'comment-help')
    })
  })
})
