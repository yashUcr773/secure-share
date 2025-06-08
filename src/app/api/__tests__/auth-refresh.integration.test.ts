// Integration tests for auth refresh endpoint

import { NextRequest } from 'next/server';
import { POST } from '../auth/refresh/route';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin } from '@/lib/security';

// Mock dependencies
jest.mock('@/lib/auth-enhanced');
jest.mock('@/lib/database');
jest.mock('@/lib/security');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockAddSecurityHeaders = addSecurityHeaders as jest.MockedFunction<typeof addSecurityHeaders>;
const mockValidateOrigin = validateOrigin as jest.MockedFunction<typeof validateOrigin>;

// Test helper to create mock requests
function createMockRequest(options: {
  refreshToken?: string;
  headers?: Record<string, string>;
  origin?: string;
} = {}): NextRequest {
  const {
    refreshToken = 'valid-refresh-token',
    headers = {},
    origin = 'http://localhost:3000'
  } = options;

  const url = origin + '/api/auth/refresh';
  const mockRequest = {
    headers: new Map(Object.entries({
      'origin': origin,
      'x-forwarded-for': '127.0.0.1',
      ...headers
    })),
    cookies: new Map(refreshToken ? [['refresh-token', { value: refreshToken }]] : []),
    url,
    method: 'POST'
  } as any;

  mockRequest.headers.get = jest.fn().mockImplementation((key: string) => {
    const headerMap = {
      'origin': origin,
      'x-forwarded-for': '127.0.0.1',
      'x-real-ip': null,
      ...headers
    };
    return headerMap[key] || null;
  });

  mockRequest.cookies.get = jest.fn().mockImplementation((key: string) => {
    if (key === 'refresh-token' && refreshToken) {
      return { value: refreshToken };
    }
    return undefined;
  });

  return mockRequest as NextRequest;
}

// Mock successful responses
const mockSuccessResponse = {
  json: jest.fn(),
  cookies: {
    set: jest.fn()
  }
};

const mockErrorResponse = {
  json: jest.fn(),
  cookies: {
    set: jest.fn()
  }
};

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => {
      const response = {
        ...mockSuccessResponse,
        data,
        status: init?.status || 200
      };
      response.json.mockReturnValue(data);
      return response;
    })
  }
}));

describe('/api/auth/refresh - Token Refresh API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 300000
    });

    mockValidateOrigin.mockReturnValue(true);
    mockAddSecurityHeaders.mockImplementation((response) => response);
    
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NODE_ENV;
  });

  describe('Successful Token Refresh', () => {
    test('should refresh token successfully with valid refresh token', async () => {
      const mockRefreshResult = {
        accessToken: 'new-access-token',
        user: { id: 'user123', email: 'test@example.com' }
      };
      
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'token_refresh:127.0.0.1',
        'refresh_attempt',
        10,
        300000
      );

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      );

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        success: true,
        message: 'Token refreshed successfully'
      });

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', 'new-access-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 900, // 15 minutes
        path: '/'
      });

      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should handle production environment securely', async () => {
      process.env.NODE_ENV = 'production';
      
      const mockRefreshResult = {
        accessToken: 'new-access-token-prod',
        user: { id: 'user123', email: 'test@example.com' }
      };
      
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', 'new-access-token-prod', {
        httpOnly: true,
        secure: true, // Should be true in production
        sameSite: 'strict',
        maxAge: 900,
        path: '/'
      });
    });

    test('should handle different IP tracking methods', async () => {
      const mockRefreshResult = {
        accessToken: 'new-access-token',
        user: { id: 'user123', email: 'test@example.com' }
      };
      
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);
      
      // Test with x-real-ip header
      const request = createMockRequest({
        headers: { 'x-real-ip': '192.168.1.100' }
      });
      
      request.headers.get = jest.fn().mockImplementation((key: string) => {
        const headerMap = {
          'x-forwarded-for': null,
          'x-real-ip': '192.168.1.100'
        };
        return headerMap[key] || null;
      });

      await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'token_refresh:192.168.1.100',
        'refresh_attempt',
        10,
        300000
      );
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits for token refresh attempts', async () => {
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 300000
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(response.data).toEqual({
        error: 'Too many token refresh requests. Please try again later.'
      });

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should track rate limits per IP address', async () => {
      const request1 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      
      const request2 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' }
      });

      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        user: { id: 'user123', email: 'test@example.com' }
      });

      await POST(request1);
      await POST(request2);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'token_refresh:192.168.1.1',
        'refresh_attempt',
        10,
        300000
      );

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'token_refresh:192.168.1.2',
        'refresh_attempt',
        10,
        300000
      );
    });

    test('should handle unknown IP addresses', async () => {
      const request = createMockRequest();
      request.headers.get = jest.fn().mockReturnValue(null);

      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        user: { id: 'user123', email: 'test@example.com' }
      });

      await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'token_refresh:unknown',
        'refresh_attempt',
        10,
        300000
      );
    });
  });

  describe('Origin Validation and CSRF Protection', () => {
    test('should reject requests from invalid origins', async () => {
      mockValidateOrigin.mockReturnValue(false);

      const request = createMockRequest({
        origin: 'https://malicious-site.com'
      });
      
      const response = await POST(request);

      expect(response.status).toBe(403);
      expect(response.data).toEqual({
        error: 'Invalid request origin'
      });

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should accept requests from allowed origins', async () => {
      mockValidateOrigin.mockReturnValue(true);
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        user: { id: 'user123', email: 'test@example.com' }
      });

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      );
    });

    test('should use NEXT_PUBLIC_BASE_URL for origin validation', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://secureshare.app';
      
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        user: { id: 'user123', email: 'test@example.com' }
      });

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['https://secureshare.app']
      );
    });
  });

  describe('Authentication and Token Validation', () => {
    test('should reject requests without refresh token', async () => {
      const request = createMockRequest({ refreshToken: '' });
      
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.data).toEqual({
        error: 'Refresh token not found'
      });

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should handle expired refresh tokens', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: null,
        error: 'Refresh token expired'
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.data).toEqual({
        error: 'Refresh token expired'
      });

      // Should clear both tokens
      expect(response.cookies.set).toHaveBeenCalledWith('refresh-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0
      });

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0
      });

      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should handle invalid refresh tokens', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: null,
        error: 'Invalid refresh token'
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.data).toEqual({
        error: 'Invalid refresh token'
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    test('should handle refresh service errors without error message', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: null
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.data).toEqual({
        error: 'Token refresh failed'
      });
    });
  });

  describe('Cookie Management', () => {
    test('should set auth token cookie with correct attributes', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token-123',
        user: { id: 'user123', email: 'test@example.com' }
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', 'new-access-token-123', {
        httpOnly: true,
        secure: false, // Development environment
        sameSite: 'strict',
        maxAge: 900, // 15 minutes
        path: '/'
      });
    });

    test('should clear cookies on authentication failure', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: null,
        error: 'Token validation failed'
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.cookies.set).toHaveBeenCalledWith('refresh-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0
      });

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle AuthService exceptions', async () => {
      mockAuthService.refreshToken.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Internal server error'
      });

      // Should clear both tokens on error
      expect(response.cookies.set).toHaveBeenCalledWith('refresh-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0
      });

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0
      });

      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should handle rate limit service failures', async () => {
      mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit service unavailable'));

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Internal server error'
      });
    });

    test('should handle malformed refresh tokens', async () => {
      const request = createMockRequest({
        refreshToken: 'malformed.token.data'
      });

      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: null,
        error: 'Malformed token'
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.data).toEqual({
        error: 'Malformed token'
      });
    });

    test('should handle concurrent refresh attempts', async () => {
      const refreshToken = 'concurrent-test-token';
      
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-concurrent-token',
        user: { id: 'user123', email: 'test@example.com' }
      });

      const request1 = createMockRequest({ refreshToken });
      const request2 = createMockRequest({ refreshToken });

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2)
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(2);
    });

    test('should handle missing environment variables', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        user: { id: 'user123', email: 'test@example.com' }
      });

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000'] // Default fallback
      );
    });
  });

  describe('Security Headers', () => {
    test('should apply security headers to all responses', async () => {
      const scenarios = [
        { 
          setup: () => mockAuthService.refreshToken.mockResolvedValue({
            accessToken: 'new-token',
            user: { id: 'user123', email: 'test@example.com' }
          }),
          expected: 200
        },
        { 
          setup: () => mockRateLimitService.checkRateLimit.mockResolvedValue({
            allowed: false,
            limit: 10,
            remaining: 0,
            reset: Date.now() + 300000
          }),
          expected: 429
        },
        { 
          setup: () => mockValidateOrigin.mockReturnValue(false),
          expected: 403
        },
        { 
          setup: () => mockAuthService.refreshToken.mockRejectedValue(new Error('Service error')),
          expected: 500
        }
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: true,
          limit: 10,
          remaining: 9,
          reset: Date.now() + 300000
        });
        mockValidateOrigin.mockReturnValue(true);
        
        scenario.setup();
        
        const request = createMockRequest();
        const response = await POST(request);
        
        expect(response.status).toBe(scenario.expected);
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      }
    });
  });

  describe('Performance and Monitoring', () => {
    test('should handle high-frequency refresh requests', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'performance-token',
        user: { id: 'user123', email: 'test@example.com' }
      });

      const requests = Array.from({ length: 5 }, () => 
        createMockRequest({ refreshToken: `token-${Math.random()}` })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(5);
    });

    test('should log errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockAuthService.refreshToken.mockRejectedValue(new Error('Database timeout'));

      const request = createMockRequest();
      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith('Token refresh error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
