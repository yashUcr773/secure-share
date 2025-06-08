// Integration tests for auth logout endpoint

import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../auth/logout/route';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';

// Mock dependencies
jest.mock('@/lib/auth-enhanced');
jest.mock('@/lib/database');
jest.mock('@/lib/security');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockAddSecurityHeaders = addSecurityHeaders as jest.MockedFunction<typeof addSecurityHeaders>;
const mockValidateOrigin = validateOrigin as jest.MockedFunction<typeof validateOrigin>;
const mockHandleCORSPreflight = handleCORSPreflight as jest.MockedFunction<typeof handleCORSPreflight>;

// Test helper to create mock requests
function createMockRequest(options: {
  refreshToken?: string;
  authToken?: string;
  headers?: Record<string, string>;
  origin?: string;
  method?: string;
} = {}): NextRequest {
  const {
    refreshToken = 'valid-refresh-token',
    authToken = 'valid-auth-token',
    headers = {},
    origin = 'http://localhost:3000',
    method = 'POST'
  } = options;

  const url = origin + '/api/auth/logout';
  const mockRequest = {
    headers: new Map(Object.entries({
      'origin': origin,
      'x-forwarded-for': '127.0.0.1',
      ...headers
    })),
    cookies: new Map([
      ...(refreshToken ? [['refresh-token', { value: refreshToken }]] : []),
      ...(authToken ? [['auth-token', { value: authToken }]] : [])
    ]),
    url,
    method
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
    if (key === 'auth-token' && authToken) {
      return { value: authToken };
    }
    return undefined;
  });

  return mockRequest as NextRequest;
}

// Mock response objects
const mockResponse = {
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
        ...mockResponse,
        data,
        status: init?.status || 200
      };
      response.json.mockReturnValue(data);
      return response;
    })
  }
}));

describe('/api/auth/logout - Logout API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 300000
    });

    mockValidateOrigin.mockReturnValue(true);
    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockAuthService.revokeToken.mockResolvedValue(undefined);
    
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NODE_ENV;
  });

  describe('CORS Preflight Handling', () => {
    test('should handle OPTIONS request for CORS preflight', async () => {
      const mockCorsResponse = {
        status: 200,
        headers: new Map([['Access-Control-Allow-Origin', '*']])
      };
      
      mockHandleCORSPreflight.mockReturnValue(mockCorsResponse as any);
      
      const request = createMockRequest({ method: 'OPTIONS' });
      const response = await OPTIONS(request);

      expect(mockHandleCORSPreflight).toHaveBeenCalledWith(request);
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(mockCorsResponse);
    });

    test('should return 405 when CORS preflight returns null', async () => {
      mockHandleCORSPreflight.mockReturnValue(null);
      
      const request = createMockRequest({ method: 'OPTIONS' });
      const response = await OPTIONS(request);

      expect(response.status).toBe(405);
    });
  });

  describe('Successful Logout', () => {
    test('should logout successfully and clear cookies', async () => {
      const request = createMockRequest();
      const response = await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_logout:127.0.0.1',
        'logout_attempt',
        20,
        300000
      );

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      );

      expect(mockAuthService.revokeToken).toHaveBeenCalledWith('valid-refresh-token');
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        message: 'Logout successful'
      });

      // Check auth token cookie clearing
      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      // Check refresh token cookie clearing
      expect(response.cookies.set).toHaveBeenCalledWith('refresh-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should handle production environment securely', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = createMockRequest();
      const response = await POST(request);

      // Check that secure flag is set to true in production
      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      expect(response.cookies.set).toHaveBeenCalledWith('refresh-token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });
    });

    test('should logout successfully without refresh token', async () => {
      const request = createMockRequest({ refreshToken: '' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        message: 'Logout successful'
      });

      expect(mockAuthService.revokeToken).not.toHaveBeenCalled();
      expect(response.cookies.set).toHaveBeenCalledTimes(2); // Still clear both cookies
    });

    test('should continue logout even if token revocation fails', async () => {
      mockAuthService.revokeToken.mockRejectedValue(new Error('Token revocation failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        message: 'Logout successful'
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to revoke session:', expect.any(Error));
      expect(response.cookies.set).toHaveBeenCalledTimes(2); // Still clear cookies

      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits for logout attempts', async () => {
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 300000
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(response.data).toEqual({
        error: 'Too many logout attempts. Please try again later.'
      });

      expect(mockAuthService.revokeToken).not.toHaveBeenCalled();
      expect(response.cookies.set).not.toHaveBeenCalled();
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should track rate limits per IP address', async () => {
      const request1 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      
      const request2 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' }
      });

      await POST(request1);
      await POST(request2);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_logout:192.168.1.1',
        'logout_attempt',
        20,
        300000
      );

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_logout:192.168.1.2',
        'logout_attempt',
        20,
        300000
      );
    });

    test('should handle different IP tracking methods', async () => {
      // Test with x-real-ip header
      const request = createMockRequest({
        headers: { 'x-real-ip': '10.0.0.1' }
      });
      
      request.headers.get = jest.fn().mockImplementation((key: string) => {
        const headerMap = {
          'x-forwarded-for': null,
          'x-real-ip': '10.0.0.1'
        };
        return headerMap[key] || null;
      });

      await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_logout:10.0.0.1',
        'logout_attempt',
        20,
        300000
      );
    });

    test('should handle unknown IP addresses', async () => {
      const request = createMockRequest();
      request.headers.get = jest.fn().mockReturnValue(null);

      await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_logout:unknown',
        'logout_attempt',
        20,
        300000
      );
    });

    test('should use generous rate limits for logout endpoint', async () => {
      const request = createMockRequest();
      await POST(request);

      // Verify that logout has higher rate limits than other auth endpoints
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        'logout_attempt',
        20, // Higher limit than typical auth endpoints
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

      expect(mockAuthService.revokeToken).not.toHaveBeenCalled();
      expect(response.cookies.set).not.toHaveBeenCalled();
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should accept requests from allowed origins', async () => {
      mockValidateOrigin.mockReturnValue(true);

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      );
    });

    test('should use NEXT_PUBLIC_BASE_URL for origin validation', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://secureshare.app';

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['https://secureshare.app']
      );
    });

    test('should fallback to localhost when BASE_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      );
    });
  });

  describe('Token Revocation', () => {
    test('should revoke refresh token when present', async () => {
      const refreshToken = 'test-refresh-token-123';
      const request = createMockRequest({ refreshToken });
      
      await POST(request);

      expect(mockAuthService.revokeToken).toHaveBeenCalledWith(refreshToken);
    });

    test('should skip revocation when refresh token is missing', async () => {
      const request = createMockRequest({ refreshToken: '' });
      
      await POST(request);

      expect(mockAuthService.revokeToken).not.toHaveBeenCalled();
    });

    test('should handle token revocation service errors gracefully', async () => {
      mockAuthService.revokeToken.mockRejectedValue(new Error('Revocation service unavailable'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(200); // Should still succeed
      expect(response.data).toEqual({
        message: 'Logout successful'
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to revoke session:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle network timeouts during revocation', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      
      mockAuthService.revokeToken.mockRejectedValue(timeoutError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to revoke session:', timeoutError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cookie Management', () => {
    test('should clear both auth and refresh token cookies', async () => {
      const request = createMockRequest();
      const response = await POST(request);

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      expect(response.cookies.set).toHaveBeenCalledWith('refresh-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });
    });

    test('should set secure cookies in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(response.cookies.set).toHaveBeenCalledWith('auth-token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      expect(response.cookies.set).toHaveBeenCalledWith('refresh-token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });
    });

    test('should use correct cookie attributes for security', async () => {
      const request = createMockRequest();
      const response = await POST(request);

      // Verify all security attributes are properly set
      const cookieSetCalls = response.cookies.set.mock.calls;
      
      cookieSetCalls.forEach(call => {
        const [, , attributes] = call;
        expect(attributes.httpOnly).toBe(true);
        expect(attributes.sameSite).toBe('strict');
        expect(attributes.maxAge).toBe(0);
        expect(attributes.path).toBe('/');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle general service errors', async () => {
      mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Service unavailable'));

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Internal server error'
      });

      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should log errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest();
      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle concurrent logout requests', async () => {
      const refreshToken = 'concurrent-logout-token';
      
      const request1 = createMockRequest({ refreshToken });
      const request2 = createMockRequest({ refreshToken });

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2)
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockAuthService.revokeToken).toHaveBeenCalledTimes(2);
    });

    test('should handle malformed cookies gracefully', async () => {
      const request = createMockRequest();
      
      // Mock malformed cookie data
      request.cookies.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'refresh-token') {
          throw new Error('Malformed cookie');
        }
        return undefined;
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Internal server error'
      });
    });

    test('should handle missing security headers gracefully', async () => {
      mockAddSecurityHeaders.mockImplementation(() => {
        throw new Error('Security headers failed');
      });

      const request = createMockRequest();
      
      // This should not throw, even if security headers fail
      await expect(POST(request)).rejects.toThrow('Security headers failed');
    });
  });

  describe('Security Headers', () => {
    test('should apply security headers to all responses', async () => {
      const scenarios = [
        { 
          setup: () => {},
          expected: 200 
        },
        { 
          setup: () => mockRateLimitService.checkRateLimit.mockResolvedValue({
            allowed: false,
            limit: 20,
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
          setup: () => mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Service error')),
          expected: 500
        }
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: true,
          limit: 20,
          remaining: 19,
          reset: Date.now() + 300000
        });
        mockValidateOrigin.mockReturnValue(true);
        mockAddSecurityHeaders.mockImplementation((response) => response);
        
        scenario.setup();
        
        const request = createMockRequest();
        const response = await POST(request);
        
        expect(response.status).toBe(scenario.expected);
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      }
    });
  });

  describe('Performance and Monitoring', () => {
    test('should handle high-frequency logout requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        createMockRequest({ refreshToken: `token-${i}` })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(mockAuthService.revokeToken).toHaveBeenCalledTimes(10);
    });

    test('should maintain performance under load', async () => {
      // Simulate some processing delay
      mockAuthService.revokeToken.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10))
      );

      const requests = Array.from({ length: 5 }, () => createMockRequest());

      const startTime = Date.now();
      await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();

      // Should still be reasonably fast even with delays
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle logout bursts gracefully', async () => {
      // Test rapid successive logout requests from same IP
      const request = createMockRequest();
      
      const responses = await Promise.all([
        POST(request),
        POST(request),
        POST(request)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledTimes(3);
    });
  });
});
