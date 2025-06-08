import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  it('renders with default classes', () => {
    render(<Input data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass(
      'flex', 
      'h-10', 
      'w-full', 
      'rounded-md', 
      'border', 
      'border-input', 
      'bg-background', 
      'px-3', 
      'py-2', 
      'text-sm'
    );
  });

  it('merges custom className with default classes', () => {
    render(<Input className="custom-input" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveClass('flex', 'h-10', 'w-full'); // Check some default classes are still there
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Input ref={ref} />);
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('sets type attribute correctly', () => {
    render(<Input type="email" data-testid="email-input" />);
    
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('defaults to text type when no type is provided', () => {
    render(<Input data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <Input 
        placeholder="Enter text..."
        aria-label="Test input"
        data-testid="input"
        maxLength={100}
        required
      />
    );
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('placeholder', 'Enter text...');
    expect(input).toHaveAttribute('aria-label', 'Test input');
    expect(input).toHaveAttribute('maxLength', '100');
    expect(input).toBeRequired();
  });

  it('handles disabled state correctly', () => {
    render(<Input disabled data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('handles user input correctly', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    
    render(<Input onChange={handleChange} data-testid="input" />);
    
    const input = screen.getByTestId('input');
    await user.type(input, 'test value');
    
    expect(input).toHaveValue('test value');
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles focus and blur events', async () => {
    const user = userEvent.setup();
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    
    render(
      <Input 
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-testid="input"
      />
    );
    
    const input = screen.getByTestId('input');
    
    await user.click(input);
    expect(handleFocus).toHaveBeenCalled();
    
    await user.tab();
    expect(handleBlur).toHaveBeenCalled();
  });

  it('applies focus-visible styles', () => {
    render(<Input data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    );
  });

  it('handles placeholder styling', () => {
    render(<Input placeholder="Enter text..." data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('placeholder:text-muted-foreground');
  });

  it('handles file input styling', () => {
    render(<Input type="file" data-testid="file-input" />);
    
    const input = screen.getByTestId('file-input');
    expect(input).toHaveClass(
      'file:border-0',
      'file:bg-transparent',
      'file:text-sm',
      'file:font-medium'
    );
  });

  it('supports controlled input', () => {
    const { rerender } = render(<Input value="initial" data-testid="input" readOnly />);
    
    let input = screen.getByTestId('input');
    expect(input).toHaveValue('initial');
    
    rerender(<Input value="updated" data-testid="input" readOnly />);
    
    input = screen.getByTestId('input');
    expect(input).toHaveValue('updated');
  });

  it('supports different input types', () => {
    const inputTypes = ['text', 'email', 'password', 'number', 'tel', 'url'];
    
    inputTypes.forEach(type => {
      render(<Input type={type as any} data-testid={`${type}-input`} />);
      
      const input = screen.getByTestId(`${type}-input`);
      expect(input).toHaveAttribute('type', type);
    });
  });

  it('handles keyboard events', async () => {
    const user = userEvent.setup();
    const handleKeyDown = jest.fn();
    const handleKeyUp = jest.fn();
    
    render(
      <Input 
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        data-testid="input"
      />
    );
    
    const input = screen.getByTestId('input');
    await user.type(input, 'a');
    
    expect(handleKeyDown).toHaveBeenCalled();
    expect(handleKeyUp).toHaveBeenCalled();
  });

  it('maintains accessibility with proper labeling', () => {
    render(
      <div>
        <label htmlFor="test-input">Test Label</label>
        <Input id="test-input" />
      </div>
    );
    
    const input = screen.getByLabelText('Test Label');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
  });
});
