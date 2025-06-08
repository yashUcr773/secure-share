// Integration tests for auth verify email endpoint

import { NextRequest } from 'next/server';
import { POST, GET } from '../auth/verify-email/route';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders } from '@/lib/security';
import { RateLimitService } from '@/lib/database';
import { sanitizeInput } from '@/lib/security';

// Mock dependencies
jest.mock('@/lib/auth-enhanced');
jest.mock('@/lib/security');
jest.mock('@/lib/database');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockAddSecurityHeaders = addSecurityHeaders as jest.MockedFunction<typeof addSecurityHeaders>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockSanitizeInput = sanitizeInput as jest.MockedFunction<typeof sanitizeInput>;

// Test helper to create mock requests
function createMockRequest(options: {
  body?: any;
  token?: string;
  ip?: string;
  method?: string;
  url?: string;
} = {}): NextRequest {
  const {
    body = { token: 'valid-verification-token' },
    token,
    ip = '127.0.0.1',
    method = 'POST',
    url = 'http://localhost:3000/api/auth/verify-email'
  } = options;

  // For GET requests, add token as query parameter
  const finalUrl = method === 'GET' && token 
    ? `${url}?token=${encodeURIComponent(token)}`
    : url;

  const mockRequest = {
    ip,
    method,
    url: finalUrl,
    json: jest.fn().mockResolvedValue(body)
  } as any;

  return mockRequest as NextRequest;
}

// Mock response objects
const mockResponse = {
  json: jest.fn(),
  headers: new Map(),
  status: 200
};

mockResponse.headers.set = jest.fn();

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => {
      const response = {
        ...mockResponse,
        data,
        status: init?.status || 200,
        headers: new Map()
      };
      response.headers.set = jest.fn();
      response.json.mockReturnValue(data);
      return response;
    })
  }
}));

describe('/api/auth/verify-email - Email Verification API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 900000,
      resetTime: Date.now() + 900000
    });

    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockSanitizeInput.mockImplementation((input) => input);
  });

  describe('POST /api/auth/verify-email - Token Verification', () => {
    describe('Successful Email Verification', () => {
      test('should verify email successfully with valid token', async () => {
        const mockVerificationResult = {
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        };
        
        mockAuthService.verifyEmail.mockResolvedValue(mockVerificationResult);
        
        const request = createMockRequest({
          body: { token: 'valid-verification-token-123' }
        });
        
        const response = await POST(request);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification',
          '127.0.0.1',
          5,
          900000
        );

        expect(mockSanitizeInput).toHaveBeenCalledWith('valid-verification-token-123');
        expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-verification-token-123');
        
        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          success: true,
          message: 'Email verified successfully. You can now login to your account.'
        });

        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));

        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should handle different token formats correctly', async () => {
        const testTokens = [
          'abc123def456ghi789jklmnopqrstuvwxyz123456',
          'TOKEN_WITH_UNDERSCORES_1234567890ABCDEF',
          'token-with-dashes-1234567890abcdef12345',
          '1234567890123456789012345678901234567890'
        ];

        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });

        for (const token of testTokens) {
          const request = createMockRequest({
            body: { token }
          });
          
          const response = await POST(request);
          
          expect(response.status).toBe(200);
          expect(mockSanitizeInput).toHaveBeenCalledWith(token);
          expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(token);
        }
      });
    });

    describe('Input Validation', () => {
      test('should reject requests with missing token', async () => {
        const request = createMockRequest({
          body: {}
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Invalid verification token format',
          details: expect.any(Array)
        });

        expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should reject tokens that are too short', async () => {
        const request = createMockRequest({
          body: { token: 'short' }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Invalid verification token format');
        expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
      });

      test('should reject tokens that are too long', async () => {
        const longToken = 'a'.repeat(129); // 129 characters, exceeds max of 128
        
        const request = createMockRequest({
          body: { token: longToken }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Invalid verification token format');
        expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
      });

      test('should sanitize input tokens', async () => {
        mockSanitizeInput.mockReturnValue('sanitized-token');
        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });

        const request = createMockRequest({
          body: { token: '<script>alert("xss")</script>malicious-token' }
        });
        
        await POST(request);

        expect(mockSanitizeInput).toHaveBeenCalledWith('<script>alert("xss")</script>malicious-token');
        expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('sanitized-token');
      });

      test('should handle invalid JSON in request body', async () => {
        const request = createMockRequest();
        request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));
        
        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(response.data).toEqual({
          error: 'Internal server error'
        });
      });
    });

    describe('Rate Limiting', () => {
      test('should enforce rate limits for verification attempts', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          limit: 5,
          remaining: 0,
          reset: Date.now() + 900000,
          resetTime: Date.now() + 900000
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(429);
        expect(response.data).toEqual({
          error: 'Too many verification attempts. Please try again later.'
        });

        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));

        expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should track rate limits per IP address', async () => {
        const request1 = createMockRequest({ ip: '192.168.1.1' });
        const request2 = createMockRequest({ ip: '192.168.1.2' });

        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });

        await POST(request1);
        await POST(request2);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification',
          '192.168.1.1',
          5,
          900000
        );

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification',
          '192.168.1.2',
          5,
          900000
        );
      });

      test('should handle unknown IP addresses', async () => {
        const request = createMockRequest({ ip: undefined });

        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });

        await POST(request);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification',
          'unknown',
          5,
          900000
        );
      });

      test('should include rate limit headers in successful responses', async () => {
        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      });
    });

    describe('Authentication Service Integration', () => {
      test('should handle expired verification tokens', async () => {
        mockAuthService.verifyEmail.mockResolvedValue({
          success: false,
          error: 'Verification token has expired'
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Verification token has expired'
        });

        expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-verification-token');
      });

      test('should handle invalid verification tokens', async () => {
        mockAuthService.verifyEmail.mockResolvedValue({
          success: false,
          error: 'Invalid verification token'
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Invalid verification token'
        });
      });

      test('should handle already verified emails', async () => {
        mockAuthService.verifyEmail.mockResolvedValue({
          success: false,
          error: 'Email is already verified'
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Email is already verified'
        });
      });

      test('should handle service errors without specific error message', async () => {
        mockAuthService.verifyEmail.mockResolvedValue({
          success: false
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Email verification failed'
        });
      });

      test('should handle service exceptions', async () => {
        mockAuthService.verifyEmail.mockRejectedValue(new Error('Database connection failed'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(response.data).toEqual({
          error: 'Internal server error'
        });

        expect(consoleSpy).toHaveBeenCalledWith('Email verification error:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('GET /api/auth/verify-email - Link-based Verification', () => {
    describe('Successful Email Verification via GET', () => {
      test('should verify email successfully with query parameter token', async () => {
        const token = 'valid-get-verification-token';
        
        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });
        
        const request = createMockRequest({
          method: 'GET',
          token,
          url: 'http://localhost:3000/api/auth/verify-email'
        });
        
        const response = await GET(request);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification_get',
          '127.0.0.1',
          5,
          900000
        );

        expect(mockSanitizeInput).toHaveBeenCalledWith(token);
        expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(token);
        
        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          success: true,
          message: 'Email verified successfully. You can now login to your account.'
        });

        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));

        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should handle URL encoded tokens correctly', async () => {
        const encodedToken = 'token%2Bwith%2Bplus%2Bsigns';
        const decodedToken = 'token+with+plus+signs';
        
        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });
        
        const request = createMockRequest({
          method: 'GET',
          token: encodedToken,
          url: 'http://localhost:3000/api/auth/verify-email'
        });
        
        await GET(request);

        expect(mockSanitizeInput).toHaveBeenCalledWith(decodedToken);
        expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(decodedToken);
      });
    });

    describe('GET Request Validation', () => {
      test('should reject GET requests without token parameter', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/auth/verify-email'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Verification token is required'
        });

        expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should reject GET requests with empty token parameter', async () => {
        const request = createMockRequest({
          method: 'GET',
          token: '',
          url: 'http://localhost:3000/api/auth/verify-email'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Verification token is required'
        });

        expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
      });

      test('should sanitize query parameter tokens', async () => {
        const maliciousToken = '<script>alert("xss")</script>token';
        
        mockSanitizeInput.mockReturnValue('sanitized-get-token');
        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });

        const request = createMockRequest({
          method: 'GET',
          token: maliciousToken,
          url: 'http://localhost:3000/api/auth/verify-email'
        });
        
        await GET(request);

        expect(mockSanitizeInput).toHaveBeenCalledWith(maliciousToken);
        expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('sanitized-get-token');
      });
    });

    describe('GET Rate Limiting', () => {
      test('should enforce separate rate limits for GET requests', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          limit: 5,
          remaining: 0,
          reset: Date.now() + 900000,
          resetTime: Date.now() + 900000
        });

        const request = createMockRequest({
          method: 'GET',
          token: 'valid-token'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(429);
        expect(response.data).toEqual({
          error: 'Too many verification attempts. Please try again later.'
        });

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification_get',
          '127.0.0.1',
          5,
          900000
        );

        expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
      });

      test('should track separate rate limits for GET and POST', async () => {
        mockAuthService.verifyEmail.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com', emailVerified: true }
        });

        const postRequest = createMockRequest({
          method: 'POST',
          body: { token: 'post-token' }
        });
        
        const getRequest = createMockRequest({
          method: 'GET',
          token: 'get-token'
        });

        await POST(postRequest);
        await GET(getRequest);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification',
          '127.0.0.1',
          5,
          900000
        );

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'email_verification_get',
          '127.0.0.1',
          5,
          900000
        );
      });
    });

    describe('GET Error Handling', () => {
      test('should handle AuthService errors in GET requests', async () => {
        mockAuthService.verifyEmail.mockResolvedValue({
          success: false,
          error: 'Token not found'
        });

        const request = createMockRequest({
          method: 'GET',
          token: 'nonexistent-token'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Token not found'
        });
      });

      test('should handle service exceptions in GET requests', async () => {
        mockAuthService.verifyEmail.mockRejectedValue(new Error('Service unavailable'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const request = createMockRequest({
          method: 'GET',
          token: 'test-token'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(response.data).toEqual({
          error: 'Internal server error'
        });

        expect(consoleSpy).toHaveBeenCalledWith('Email verification error:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Security Headers', () => {
    test('should apply security headers to all POST responses', async () => {
      const scenarios = [
        { 
          setup: () => mockAuthService.verifyEmail.mockResolvedValue({
            success: true,
            user: { id: 'user123', email: 'test@example.com', emailVerified: true }
          }),
          expected: 200
        },
        { 
          setup: () => mockRateLimitService.checkRateLimit.mockResolvedValue({
            allowed: false,
            limit: 5,
            remaining: 0,
            reset: Date.now() + 900000,
            resetTime: Date.now() + 900000
          }),
          expected: 429
        },
        { 
          setup: () => mockAuthService.verifyEmail.mockRejectedValue(new Error('Service error')),
          expected: 500
        }
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: true,
          limit: 5,
          remaining: 4,
          reset: Date.now() + 900000,
          resetTime: Date.now() + 900000
        });
        mockAddSecurityHeaders.mockImplementation((response) => response);
        
        scenario.setup();
        
        const request = createMockRequest();
        const response = await POST(request);
        
        expect(response.status).toBe(scenario.expected);
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      }
    });

    test('should apply security headers to all GET responses', async () => {
      const scenarios = [
        { 
          setup: () => mockAuthService.verifyEmail.mockResolvedValue({
            success: true,
            user: { id: 'user123', email: 'test@example.com', emailVerified: true }
          }),
          expected: 200
        },
        { 
          setup: () => mockRateLimitService.checkRateLimit.mockResolvedValue({
            allowed: false,
            limit: 5,
            remaining: 0,
            reset: Date.now() + 900000,
            resetTime: Date.now() + 900000
          }),
          expected: 429
        },
        { 
          setup: () => mockAuthService.verifyEmail.mockRejectedValue(new Error('Service error')),
          expected: 500
        }
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: true,
          limit: 5,
          remaining: 4,
          reset: Date.now() + 900000,
          resetTime: Date.now() + 900000
        });
        mockAddSecurityHeaders.mockImplementation((response) => response);
        
        scenario.setup();
        
        const request = createMockRequest({
          method: 'GET',
          token: 'test-token'
        });
        
        const response = await GET(request);
        
        expect(response.status).toBe(scenario.expected);
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle concurrent verification attempts', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', emailVerified: true }
      });

      const requests = Array.from({ length: 3 }, (_, i) => 
        createMockRequest({
          body: { token: `concurrent-token-${i}` }
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockAuthService.verifyEmail).toHaveBeenCalledTimes(3);
    });

    test('should handle rate limit service failures gracefully', async () => {
      mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit service down'));

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Internal server error'
      });
    });

    test('should maintain performance under load', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', emailVerified: true }
      });

      const requests = Array.from({ length: 10 }, () => createMockRequest());

      const startTime = Date.now();
      await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle mixed GET and POST requests correctly', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', emailVerified: true }
      });

      const postRequest = createMockRequest({
        method: 'POST',
        body: { token: 'post-verification-token' }
      });
      
      const getRequest = createMockRequest({
        method: 'GET',
        token: 'get-verification-token'
      });

      const [postResponse, getResponse] = await Promise.all([
        POST(postRequest),
        GET(getRequest)
      ]);

      expect(postResponse.status).toBe(200);
      expect(getResponse.status).toBe(200);
      
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('post-verification-token');
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('get-verification-token');
    });
  });
});
