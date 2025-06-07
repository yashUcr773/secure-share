// Mock implementation of useCSRF hook for testing
export const useCSRF = jest.fn(() => ({
  token: 'mock-csrf-token',
  isLoading: false,
  getToken: jest.fn(() => 'mock-csrf-token'),
  refreshToken: jest.fn(() => 'mock-csrf-token'),
  getHeaders: jest.fn(() => ({ 
    'X-CSRF-Token': 'mock-csrf-token', 
    'Content-Type': 'application/json' 
  })),
  csrfFetch: jest.fn(),
}));
