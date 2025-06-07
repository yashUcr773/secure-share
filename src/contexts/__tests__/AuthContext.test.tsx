// AuthContext tests
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the token refresh service
jest.mock('@/lib/token-refresh', () => ({
  authenticatedFetch: jest.fn(),
  startTokenRefreshTimer: jest.fn(),
}));

// Mock the CSRF hook
jest.mock('@/hooks/useCSRF', () => ({
  useCSRF: () => ({
    csrfFetch: jest.fn(),
  }),
}));

const mockAuthenticatedFetch = require('@/lib/token-refresh').authenticatedFetch;
const mockStartTokenRefreshTimer = require('@/lib/token-refresh').startTokenRefreshTimer;

// Test component that uses the auth context
const TestComponent = () => {
  const { user, loading, login, signup, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as: ${user.email}` : 'Not logged in'}
      </div>
      <button 
        onClick={() => login('test@example.com', 'password')}
        data-testid="login-btn"
      >
        Login
      </button>
      <button 
        onClick={() => signup('test@example.com', 'password', 'password')}
        data-testid="signup-btn"
      >
        Signup
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: false, // Initial auth check fails (user not logged in)
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        user: { id: '1', email: 'test@example.com' }
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    // Mock successful login
    const mockCsrfFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: { id: '1', email: 'test@example.com' }
      }),
    });

    // Mock the useCSRF hook to return our mock function
    jest.doMock('@/hooks/useCSRF', () => ({
      useCSRF: () => ({
        csrfFetch: mockCsrfFetch,
      }),
    }));

    await act(async () => {
      await user.click(screen.getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      });
    });
  });

  it('should handle login failure', async () => {
    const user = userEvent.setup();
    
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
    });

    const mockCsrfFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Invalid credentials'
      }),
    });

    jest.doMock('@/hooks/useCSRF', () => ({
      useCSRF: () => ({
        csrfFetch: mockCsrfFetch,
      }),
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalled();
    });
  });

  it('should handle signup in development mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const user = userEvent.setup();
    
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
    });

    const mockCsrfFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: { id: '1', email: 'test@example.com' }
        }),
      });

    jest.doMock('@/hooks/useCSRF', () => ({
      useCSRF: () => ({
        csrfFetch: mockCsrfFetch,
      }),
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByTestId('signup-btn'));
    });

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          email: 'test@example.com', 
          password: 'password', 
          confirmPassword: 'password' 
        }),
      });
    });

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should handle signup in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const user = userEvent.setup();
    
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
    });

    const mockCsrfFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    jest.doMock('@/hooks/useCSRF', () => ({
      useCSRF: () => ({
        csrfFetch: mockCsrfFetch,
      }),
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByTestId('signup-btn'));
    });

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          email: 'test@example.com', 
          password: 'password', 
          confirmPassword: 'password' 
        }),
      });
    });

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should handle logout', async () => {
    const user = userEvent.setup();
    
    // Mock initial logged-in state
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        user: { id: '1', email: 'test@example.com' }
      }),
    });

    const mockCsrfFetch = jest.fn().mockResolvedValue({
      ok: true,
    });

    jest.doMock('@/hooks/useCSRF', () => ({
      useCSRF: () => ({
        csrfFetch: mockCsrfFetch,
      }),
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Logged in as: test@example.com')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByTestId('logout-btn'));
    });

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
    });

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });

  it('should start token refresh timer when user is authenticated', async () => {
    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: { id: '1', email: 'test@example.com' }
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Logged in as: test@example.com')).toBeInTheDocument();
    });

    // Wait for the timer to be called
    await waitFor(() => {
      expect(mockStartTokenRefreshTimer).toHaveBeenCalled();
    });
  });

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    console.error = originalError;
  });
});
