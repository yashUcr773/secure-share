// Unit tests for DashboardLayout component
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardLayout } from '../DashboardLayout';

// Mock child components
jest.mock('../Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

jest.mock('../Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock AuthContext
const mockUseAuth = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('DashboardLayout Component', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const TestChildren = () => <div data-testid="children">Test Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <DashboardLayout>
        <TestChildren />
      </DashboardLayout>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('should show login prompt when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <DashboardLayout>
        <TestChildren />
      </DashboardLayout>
    );

    expect(screen.getByText('Please log in to access this page.')).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });

  it('should render full layout when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <DashboardLayout>
        <TestChildren />
      </DashboardLayout>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('should have correct layout structure', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { container } = render(
      <DashboardLayout>
        <TestChildren />
      </DashboardLayout>
    );

    // Check for proper layout classes
    const layout = container.firstChild as HTMLElement;
    expect(layout).toHaveClass('min-h-screen');
    expect(layout).toHaveClass('bg-background');
  });

  it('should render children in main content area', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div data-testid="custom-content">Custom Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom Dashboard Content')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <DashboardLayout>
        <TestChildren />
      </DashboardLayout>
    );

    // Check for proper semantic structure
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should handle responsive layout', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { container } = render(
      <DashboardLayout>
        <TestChildren />
      </DashboardLayout>
    );

    // Check for responsive classes
    const mainContent = container.querySelector('[data-testid="children"]')?.parentElement;
    expect(mainContent).toHaveClass('flex-1');
  });

  it('should maintain scroll behavior', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const { container } = render(
      <DashboardLayout>
        <div style={{ height: '2000px' }}>Tall Content</div>
      </DashboardLayout>
    );

    const layout = container.firstChild as HTMLElement;
    expect(layout).toHaveClass('min-h-screen');
  });
});
