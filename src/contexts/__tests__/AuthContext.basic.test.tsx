// Minimal AuthContext test to check if tests run at all
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    csrfFetch: mockCsrfFetch,
  }),
}));

import { AuthProvider, useAuth } from '../AuthContext';

const TestComponent = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  return <div>User: {user ? user.email : 'None'}</div>;
};

describe('AuthContext - Basic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false, // Not authenticated by default
    });
  });

  it('should render without crashing', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('User: None')).toBeInTheDocument();
    });
  });
});
