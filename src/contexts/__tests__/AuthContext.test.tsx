// AuthContext tests
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the token refresh service
const mockAuthenticatedFetch = jest.fn();
const mockStartTokenRefreshTimer = jest.fn();

jest.mock('../../lib/token-refresh', () => ({
  authenticatedFetch: mockAuthenticatedFetch,
  startTokenRefreshTimer: mockStartTokenRefreshTimer,
}));

// Mock the CSRF hook  
const mockCsrfFetch = jest.fn();

jest.mock('@/hooks/useCSRF', () => ({
  useCSRF: () => ({
    token: 'mock-csrf-token',
    isLoading: false,
    getToken: () => 'mock-csrf-token',
    refreshToken: () => 'mock-csrf-token',
    getHeaders: () => ({ 'X-CSRF-Token': 'mock-csrf-token', 'Content-Type': 'application/json' }),
    csrfFetch: mockCsrfFetch,
  }),
}));

import { AuthProvider, useAuth } from '../AuthContext';

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
    jest.useFakeTimers();
    // Reset all mocks
    mockCsrfFetch.mockReset();
    mockAuthenticatedFetch.mockReset();
    mockStartTokenRefreshTimer.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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
    });

    mockCsrfFetch.mockResolvedValue({
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

    // Use act to wrap user interactions that cause state updates
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

    mockCsrfFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Invalid credentials'
      }),
    });

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
    const user = userEvent.setup();
    
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
    });

    // Mock signup success
    mockCsrfFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Mock subsequent login success
      .mockResolvedValueOnce({
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
  });  it('should handle signup in production mode', async () => {
    const user = userEvent.setup();
    
    // Mock the signup process to behave like production (no auto-login)
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
    });

    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        success: true,
        requiresVerification: true,
        message: 'Account created successfully! Please check your email for verification instructions.' 
      }),
    });

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
  });
  it('should handle logout', async () => {
    const user = userEvent.setup();
    
    // Mock initial auth check to show user as logged in
    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: { id: '1', email: 'test@example.com' }
      }),
    });

    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for user to be logged in
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
  });  it('should start token refresh timer when user is authenticated', async () => {
    // Mock authenticated user check
    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: { id: '1', email: 'test@example.com' }
      }),
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText('Logged in as: test@example.com')).toBeInTheDocument();
    });

    // Fast-forward timers to trigger the timeout
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Check that the timer was called
    expect(mockStartTokenRefreshTimer).toHaveBeenCalled();
  });
});
