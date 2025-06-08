// Integration tests for auth me API - current user information endpoint
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '@/app/api/auth/me/route';

// Mock dependencies
jest.mock('@/lib/auth-enhanced', () => ({
  AuthService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('@/lib/database', () => ({
  RateLimitService: {
    checkRateLimit: jest.fn(),
    recordAttempt: jest.fn(),
  },
}));

jest.mock('@/lib/security', () => ({
  addSecurityHeaders: jest.fn(),
  validateOrigin: jest.fn(),
  handleCORSPreflight: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  getClientIP: jest.fn(),
}));

import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';
import { getClientIP } from '@/lib/rate-limit';

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockAddSecurityHeaders = addSecurityHeaders as jest.Mock;
const mockValidateOrigin = validateOrigin as jest.Mock;
const mockHandleCORS = handleCORSPreflight as jest.Mock;
const mockGetClientIP = getClientIP as jest.Mock;

describe('Auth Me API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    passwordHash: 'hashed-password',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockValidateOrigin.mockReturnValue(true);
    mockGetClientIP.mockReturnValue('127.0.0.1');
    
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000,
    });
    
    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: mockUser,
      payload: {
        userId: 'user-123',
        sessionId: 'session-123',
        type: 'access',
      },
    });
  });

  const createMockRequest = (method: string, headers?: Record<string, string>) => {
    return new NextRequest('https://localhost:3000/api/auth/me', {
      method,
      headers: {
        'content-type': 'application/json',
        'origin': 'https://localhost:3000',
        'cookie': 'auth-token=valid-token',
        ...headers,
      },
    });
  };

  describe('OPTIONS /api/auth/me', () => {
    test('should handle CORS preflight request', async () => {
      const mockResponse = new Response(null, { status: 200 });
      mockHandleCORS.mockReturnValueOnce(mockResponse);

      const request = createMockRequest('OPTIONS');
      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(mockHandleCORS).toHaveBeenCalledWith(request);
      expect(mockAddSecurityHeaders).toHaveBeenCalled();
    });

    test('should reject invalid CORS preflight', async () => {
      mockHandleCORS.mockReturnValueOnce(null);

      const request = createMockRequest('OPTIONS');
      const response = await OPTIONS(request);

      expect(response.status).toBe(405);
    });
  });

  describe('GET /api/auth/me', () => {
    describe('✅ Success Cases', () => {
      test('should return current user information', async () => {
        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          isActive: mockUser.isActive,
          createdAt: mockUser.createdAt,
        });
        expect(data.user.passwordHash).toBeUndefined();
      });

      test('should apply rate limiting', async () => {
        const request = createMockRequest('GET');
        await GET(request);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'auth_me',
          '127.0.0.1',
          100, // requests
          60 * 1000 // per minute
        );
      });

      test('should validate request origin', async () => {
        const request = createMockRequest('GET');
        await GET(request);

        expect(mockValidateOrigin).toHaveBeenCalledWith(
          request,
          ['http://localhost:3000']
        );
      });

      test('should apply security headers', async () => {
        const request = createMockRequest('GET');
        await GET(request);

        expect(mockAddSecurityHeaders).toHaveBeenCalled();
      });
    });

    describe('❌ Error Cases', () => {
      test('should return 403 for invalid origin', async () => {
        mockValidateOrigin.mockReturnValueOnce(false);

        const request = createMockRequest('GET', {
          'origin': 'https://malicious-site.com',
        });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid request origin');
      });

      test('should return 429 for rate limit exceeded', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValueOnce({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
        });

        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toBe('Too many requests');
      });

      test('should return 401 for missing auth token', async () => {
        const request = createMockRequest('GET', {
          'cookie': '', // No auth token
        });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Not authenticated');
      });

      test('should return 401 for invalid token', async () => {
        mockAuthService.verifyToken.mockResolvedValueOnce({
          valid: false,
          error: 'Token expired',
        });

        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
      });

      test('should return 401 for null user', async () => {
        mockAuthService.verifyToken.mockResolvedValueOnce({
          valid: true,
          user: null,
        });

        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
      });

      test('should handle authentication service errors', async () => {
        mockAuthService.verifyToken.mockRejectedValueOnce(new Error('Service unavailable'));

        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });

    describe('🔒 Security Features', () => {
      test('should not expose sensitive user information', async () => {
        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(data.user.passwordHash).toBeUndefined();
        expect(data.user.emailVerificationToken).toBeUndefined();
        expect(data.user.passwordResetToken).toBeUndefined();
      });

      test('should validate user account status', async () => {
        const inactiveUser = { ...mockUser, isActive: false };
        mockAuthService.verifyToken.mockResolvedValueOnce({
          valid: true,
          user: inactiveUser,
        });

        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user.isActive).toBe(false);
      });

      test('should handle malformed auth token', async () => {
        const request = createMockRequest('GET', {
          'cookie': 'auth-token=malformed.token.here',
        });

        mockAuthService.verifyToken.mockResolvedValueOnce({
          valid: false,
          error: 'Malformed token',
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
      });
    });

    describe('🎯 Edge Cases', () => {
      test('should handle concurrent requests', async () => {
        const requests = Array.from({ length: 5 }, () => createMockRequest('GET'));

        const responses = await Promise.all(
          requests.map(req => GET(req))
        );

        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        expect(mockAuthService.verifyToken).toHaveBeenCalledTimes(5);
      });

      test('should handle empty cookie value', async () => {
        const request = createMockRequest('GET', {
          'cookie': 'auth-token=; other-cookie=value',
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Not authenticated');
      });

      test('should handle missing user properties', async () => {
        const partialUser = {
          id: 'user-123',
          email: 'test@example.com',
          // Missing other properties
        };

        mockAuthService.verifyToken.mockResolvedValueOnce({
          valid: true,
          user: partialUser,
        });

        const request = createMockRequest('GET');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user.id).toBe('user-123');
        expect(data.user.email).toBe('test@example.com');
      });

      test('should handle very large user objects', async () => {
        const largeUser = {
          ...mockUser,
          metadata: 'x'.repeat(10000), // Very large field
        };

        mockAuthService.verifyToken.mockResolvedValueOnce({
          valid: true,
          user: largeUser,
        });

        const request = createMockRequest('GET');
        const response = await GET(request);

        expect(response.status).toBe(200);
      });
    });

    describe('🔄 Integration Scenarios', () => {
      test('should handle complete user info retrieval workflow', async () => {
        // 1. Rate limit check
        const request = createMockRequest('GET');
        
        // 2. Origin validation
        expect(mockValidateOrigin).not.toHaveBeenCalled();
        
        // 3. Authentication
        expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
        
        // Execute request
        const response = await GET(request);
        const data = await response.json();

        // Verify complete flow
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalled();
        expect(mockValidateOrigin).toHaveBeenCalled();
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
        expect(mockAddSecurityHeaders).toHaveBeenCalled();
        
        expect(response.status).toBe(200);
        expect(data.user).toBeDefined();
      });

      test('should handle rate limiting with proper headers', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValueOnce({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
        });

        const request = createMockRequest('GET');
        const response = await GET(request);

        expect(response.status).toBe(429);
        expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
        expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
      });

      test('should work with different user account states', async () => {
        const testUsers = [
          { ...mockUser, emailVerified: false },
          { ...mockUser, isActive: false },
          { ...mockUser, name: null },
        ];

        for (const testUser of testUsers) {
          mockAuthService.verifyToken.mockResolvedValueOnce({
            valid: true,
            user: testUser,
          });

          const request = createMockRequest('GET');
          const response = await GET(request);
          const data = await response.json();

          expect(response.status).toBe(200);
          expect(data.user.id).toBe(testUser.id);
        }
      });
    });

    describe('🚀 Performance', () => {
      test('should handle high-frequency requests', async () => {
        const startTime = Date.now();
        
        const requests = Array.from({ length: 20 }, () => createMockRequest('GET'));
        await Promise.all(requests.map(req => GET(req)));
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });

      test('should handle timeout scenarios', async () => {
        mockAuthService.verifyToken.mockImplementationOnce(
          () => new Promise(resolve => setTimeout(resolve, 100))
        );

        const request = createMockRequest('GET');
        const startTime = Date.now();
        await GET(request);
        const duration = Date.now() - startTime;

        expect(duration).toBeGreaterThan(90); // Verify delay occurred
      });
    });

    describe('📊 Analytics and Monitoring', () => {
      test('should track rate limiting attempts', async () => {
        const request = createMockRequest('GET');
        await GET(request);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'auth_me',
          '127.0.0.1',
          100,
          60 * 1000
        );
      });

      test('should track authentication failures', async () => {
        mockAuthService.verifyToken.mockResolvedValueOnce({
          valid: false,
          error: 'Token expired',
        });

        const request = createMockRequest('GET');
        const response = await GET(request);

        expect(response.status).toBe(401);
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
      });

      test('should log errors appropriately', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        mockAuthService.verifyToken.mockRejectedValueOnce(new Error('Database error'));

        const request = createMockRequest('GET');
        await GET(request);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Auth verification error:',
          expect.any(Error)
        );
        
        consoleSpy.mockRestore();
      });
    });
  });
});
