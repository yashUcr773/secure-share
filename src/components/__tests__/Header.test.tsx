// Unit tests for Header component
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { usePathname } from 'next/navigation';
import { Header } from '../Header';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock AuthContext
const mockLogout = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('Header Component', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('should render logo and navigation', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    expect(screen.getByText('SecureShare')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /secureshare/i })).toHaveAttribute('href', '/');
  });

  it('should show loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
      loading: true,
    });

    render(<Header />);

    const loadingElement = screen.getByRole('generic');
    expect(loadingElement).toHaveClass('animate-pulse');
  });

  it('should show login/signup buttons when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('should show user menu when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('should handle logout correctly', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should not show auth buttons on auth pages', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth/login');
    mockUseAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });

  it('should highlight active navigation items', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('text-primary');
  });

  it('should be accessible', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
      loading: false,
    });

    render(<Header />);

    // Tab through navigation elements
    await user.tab();
    expect(screen.getByRole('link', { name: /secureshare/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Login')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Sign Up')).toHaveFocus();
  });
});
