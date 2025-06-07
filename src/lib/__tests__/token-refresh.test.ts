// Token refresh service tests
import { tokenRefreshService, authenticatedFetch } from '../token-refresh';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Token Refresh Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await tokenRefreshService.refreshToken();
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should handle refresh failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Refresh failed' }),
      } as Response);

      const result = await tokenRefreshService.refreshToken();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh failed');
    });

    it('should handle network errors during refresh', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await tokenRefreshService.refreshToken();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error during token refresh');
    });

    it('should prevent concurrent refresh attempts', async () => {
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => delayedPromise);

      // Start two refresh attempts simultaneously
      const promise1 = tokenRefreshService.refreshToken();
      const promise2 = tokenRefreshService.refreshToken();

      // Resolve the delayed promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one actual call
    });
  });

  describe('Token Expiry Detection', () => {
    it('should detect expired token responses', () => {
      const expiredResponse = {
        status: 401,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
      } as Response;

      expect(tokenRefreshService.isTokenExpiredResponse(expiredResponse)).toBe(true);
    });

    it('should not detect non-401 responses as expired', () => {
      const okResponse = {
        status: 200,
        headers: {
          get: () => 'application/json',
        },
      } as Response;

      expect(tokenRefreshService.isTokenExpiredResponse(okResponse)).toBe(false);
    });

    it('should handle responses without content-type header', () => {
      const response = {
        status: 401,
        headers: {
          get: () => null,
        },
      } as Response;

      expect(tokenRefreshService.isTokenExpiredResponse(response)).toBe(false);
    });
  });

  describe('Retry with Refresh', () => {
    it('should retry request after successful refresh', async () => {
      // Mock successful refresh
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        } as Response);

      const originalRequest = jest.fn(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        } as Response)
      );

      const result = await tokenRefreshService.retryWithRefresh(originalRequest);

      expect(result.ok).toBe(true);
      expect(originalRequest).toHaveBeenCalled();
    });    it('should redirect to login on refresh failure', async () => {
      // Mock failed refresh
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Refresh failed' }),
      } as Response);

      const originalRequest = jest.fn();
      
      await expect(
        tokenRefreshService.retryWithRefresh(originalRequest)
      ).rejects.toThrow('Session expired. Please log in again.');
    });
  });

  describe('Authenticated Fetch', () => {
    it('should make request with credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      } as Response);

      await authenticatedFetch('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        credentials: 'include',
      });
    });

    it('should retry on token expiry', async () => {
      // First call returns 401 (expired token)
      mockFetch
        .mockResolvedValueOnce({
          status: 401,
          headers: {
            get: (name: string) => name === 'content-type' ? 'application/json' : null,
          },
        } as Response)
        // Refresh token call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
        // Retry original request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        } as Response);

      const result = await authenticatedFetch('/api/test');

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + refresh + retry
    });

    it('should pass through options to fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      } as Response);

      const options = {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: { 'Content-Type': 'application/json' },
      };

      await authenticatedFetch('/api/test', options);

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        ...options,
        credentials: 'include',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authenticatedFetch('/api/test')).rejects.toThrow('Network error');
    });
  });
});
