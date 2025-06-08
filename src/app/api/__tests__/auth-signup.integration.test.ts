// Integration tests for auth signup endpoint

import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../auth/signup/route';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';

// Mock dependencies
jest.mock('@/lib/auth-enhanced');
jest.mock('@/lib/database');
jest.mock('@/lib/security');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockAddSecurityHeaders = addSecurityHeaders as jest.MockedFunction<typeof addSecurityHeaders>;
const mockValidateOrigin = validateOrigin as jest.MockedFunction<typeof validateOrigin>;
const mockHandleCORSPreflight = handleCORSPreflight as jest.MockedFunction<typeof handleCORSPreflight>;
const mockSanitizeInput = sanitizeInput as jest.MockedFunction<typeof sanitizeInput>;

// Test helper to create mock requests
function createMockRequest(options: {
  body?: any;
  headers?: Record<string, string>;
  origin?: string;
  method?: string;
} = {}): NextRequest {
  const {
    body = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    },
    headers = {},
    origin = 'http://localhost:3000',
    method = 'POST'
  } = options;

  const url = origin + '/api/auth/signup';
  const mockRequest = {
    headers: new Map(Object.entries({
      'origin': origin,
      'x-forwarded-for': '127.0.0.1',
      ...headers
    })),
    url,
    method,
    json: jest.fn().mockResolvedValue(body)
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

  return mockRequest as NextRequest;
}

// Mock response objects
const mockResponse = {
  json: jest.fn(),
  status: 200
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

describe('/api/auth/signup - User Registration API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      limit: 3,
      remaining: 2,
      reset: Date.now() + 3600000
    });

    mockValidateOrigin.mockReturnValue(true);
    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockHandleCORSPreflight.mockReturnValue(null);
    mockSanitizeInput.mockImplementation((input) => input);
    
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

  describe('Successful User Registration', () => {
    test('should register user successfully with valid input', async () => {
      const mockRegistrationResult = {
        success: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };
      
      mockAuthService.register.mockResolvedValue(mockRegistrationResult);
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_signup:127.0.0.1',
        'signup_attempt',
        3,
        3600000
      );

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      );

      expect(mockSanitizeInput).toHaveBeenCalledWith('test@example.com');
      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'SecurePassword123!');
      
      expect(response.status).toBe(201);
      expect(response.data).toEqual({
        message: 'Account created successfully! You can now log in.',
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should handle email normalization correctly', async () => {
      const mockRegistrationResult = {
        success: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };
      
      mockAuthService.register.mockResolvedValue(mockRegistrationResult);
      
      const request = createMockRequest({
        body: {
          email: '  TEST@EXAMPLE.COM  ',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!'
        }
      });
      
      await POST(request);

      // Should normalize email to lowercase and trim whitespace
      expect(mockSanitizeInput).toHaveBeenCalledWith('test@example.com');
      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'SecurePassword123!');
    });

    test('should sanitize email input against XSS', async () => {
      mockSanitizeInput.mockReturnValue('sanitized@example.com');
      
      const mockRegistrationResult = {
        success: true,
        user: {
          id: 'user123',
          email: 'sanitized@example.com',
          name: 'Test User'
        }
      };
      
      mockAuthService.register.mockResolvedValue(mockRegistrationResult);
      
      const request = createMockRequest({
        body: {
          email: '<script>alert("xss")</script>test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!'
        }
      });
      
      await POST(request);

      expect(mockSanitizeInput).toHaveBeenCalledWith('<script>alert("xss")</script>test@example.com');
      expect(mockAuthService.register).toHaveBeenCalledWith('sanitized@example.com', 'SecurePassword123!');
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'invalid-email',
        'missing@',
        '@missing-local.com',
        'spaces in@email.com',
        'multiple@@at.com',
        ''
      ];

      for (const email of invalidEmails) {
        const request = createMockRequest({
          body: {
            email,
            password: 'SecurePassword123!',
            confirmPassword: 'SecurePassword123!'
          }
        });
        
        const response = await POST(request);
        
        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(response.data.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['email'],
              message: 'Invalid email address'
            })
          ])
        );
        
        expect(mockAuthService.register).not.toHaveBeenCalled();
      }
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        '',
        'short',
        '1234567', // 7 characters
        'password' // 8 characters but weak
      ];

      for (const password of weakPasswords) {
        const request = createMockRequest({
          body: {
            email: 'test@example.com',
            password,
            confirmPassword: password
          }
        });
        
        const response = await POST(request);
        
        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(response.data.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['password'],
              message: 'Password must be at least 8 characters'
            })
          ])
        );
        
        expect(mockAuthService.register).not.toHaveBeenCalled();
      }
    });

    test('should reject mismatched passwords', async () => {
      const request = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'DifferentPassword456!'
        }
      });
      
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Validation failed');
      expect(response.data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['confirmPassword'],
            message: "Passwords don't match"
          })
        ])
      );

      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    test('should reject missing required fields', async () => {
      const incompleteRequests = [
        { password: 'SecurePassword123!', confirmPassword: 'SecurePassword123!' },
        { email: 'test@example.com', confirmPassword: 'SecurePassword123!' },
        { email: 'test@example.com', password: 'SecurePassword123!' },
        {}
      ];

      for (const body of incompleteRequests) {
        const request = createMockRequest({ body });
        
        const response = await POST(request);
        
        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(mockAuthService.register).not.toHaveBeenCalled();
      }
    });

    test('should handle malformed JSON in request body', async () => {
      const request = createMockRequest();
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));
      
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Internal server error'
      });
    });

    test('should validate multiple fields simultaneously', async () => {
      const request = createMockRequest({
        body: {
          email: 'invalid-email',
          password: 'short',
          confirmPassword: 'different'
        }
      });
      
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Validation failed');
      expect(response.data.details).toHaveLength(3); // Email, password length, password mismatch
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce strict rate limits for signup attempts', async () => {
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        limit: 3,
        remaining: 0,
        reset: Date.now() + 3600000
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(response.data).toEqual({
        error: 'Too many signup attempts. Please try again later.'
      });

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should track rate limits per IP address', async () => {
      const request1 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      
      const request2 = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' }
      });

      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      await POST(request1);
      await POST(request2);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_signup:192.168.1.1',
        'signup_attempt',
        3,
        3600000
      );

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_signup:192.168.1.2',
        'signup_attempt',
        3,
        3600000
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

      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_signup:10.0.0.1',
        'signup_attempt',
        3,
        3600000
      );
    });

    test('should handle unknown IP addresses', async () => {
      const request = createMockRequest();
      request.headers.get = jest.fn().mockReturnValue(null);

      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      await POST(request);

      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'auth_signup:unknown',
        'signup_attempt',
        3,
        3600000
      );
    });

    test('should use conservative rate limits for signup', async () => {
      const request = createMockRequest();

      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      await POST(request);

      // Verify that signup has strict rate limits
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        'signup_attempt',
        3, // Only 3 attempts per hour
        3600000 // 1 hour window
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

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
    });

    test('should accept requests from allowed origins', async () => {
      mockValidateOrigin.mockReturnValue(true);
      
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
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
      
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['https://secureshare.app']
      );
    });

    test('should fallback to localhost when BASE_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      const request = createMockRequest();
      
      await POST(request);

      expect(mockValidateOrigin).toHaveBeenCalledWith(
        request,
        ['http://localhost:3000']
      );
    });
  });

  describe('Authentication Service Integration', () => {
    test('should handle existing user registration attempts', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'User with this email already exists'
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data).toEqual({
        error: 'User with this email already exists'
      });

      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'SecurePassword123!');
    });

    test('should handle registration service failures', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Email service unavailable'
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data).toEqual({
        error: 'Email service unavailable'
      });
    });

    test('should handle service exceptions', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Database connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Internal server error'
      });

      expect(consoleSpy).toHaveBeenCalledWith('Signup error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle password hashing failures', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Failed to secure password'
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data).toEqual({
        error: 'Failed to secure password'
      });
    });

    test('should handle database constraint violations', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Database constraint violation'
      });

      const request = createMockRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data).toEqual({
        error: 'Database constraint violation'
      });
    });
  });

  describe('Password Security', () => {
    test('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPassword123!',
        'AnotherGood1@Password',
        'Complex$Pass2023',
        'Secure!Password123'
      ];

      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      for (const password of strongPasswords) {
        jest.clearAllMocks();
        
        const request = createMockRequest({
          body: {
            email: 'test@example.com',
            password,
            confirmPassword: password
          }
        });
        
        const response = await POST(request);
        
        expect(response.status).toBe(201);
        expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', password);
      }
    });

    test('should handle extremely long passwords', async () => {
      const veryLongPassword = 'a'.repeat(200);
      
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      const request = createMockRequest({
        body: {
          email: 'test@example.com',
          password: veryLongPassword,
          confirmPassword: veryLongPassword
        }
      });
      
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', veryLongPassword);
    });

    test('should handle special characters in passwords', async () => {
      const specialCharPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      const request = createMockRequest({
        body: {
          email: 'test@example.com',
          password: specialCharPassword,
          confirmPassword: specialCharPassword
        }
      });
      
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', specialCharPassword);
    });
  });

  describe('Security Headers', () => {
    test('should apply security headers to all responses', async () => {
      const scenarios = [
        { 
          setup: () => mockAuthService.register.mockResolvedValue({
            success: true,
            user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
          }),
          expected: 201
        },
        { 
          setup: () => mockRateLimitService.checkRateLimit.mockResolvedValue({
            allowed: false,
            limit: 3,
            remaining: 0,
            reset: Date.now() + 3600000
          }),
          expected: 429
        },
        { 
          setup: () => mockValidateOrigin.mockReturnValue(false),
          expected: 403
        },
        { 
          setup: () => mockAuthService.register.mockRejectedValue(new Error('Service error')),
          expected: 500
        }
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: true,
          limit: 3,
          remaining: 2,
          reset: Date.now() + 3600000
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

  describe('Performance and Edge Cases', () => {
    test('should handle concurrent signup requests', async () => {
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      const requests = Array.from({ length: 3 }, (_, i) => 
        createMockRequest({
          body: {
            email: `user${i}@example.com`,
            password: 'SecurePassword123!',
            confirmPassword: 'SecurePassword123!'
          }
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      expect(mockAuthService.register).toHaveBeenCalledTimes(3);
    });

    test('should maintain performance under load', async () => {
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
      });

      const requests = Array.from({ length: 5 }, () => createMockRequest());

      const startTime = Date.now();
      await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
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

    test('should handle unicode characters in email', async () => {
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'tëst@example.com', name: 'Test User' }
      });

      const request = createMockRequest({
        body: {
          email: 'tëst@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!'
        }
      });
      
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockSanitizeInput).toHaveBeenCalledWith('tëst@example.com');
    });

    test('should handle extremely long email addresses', async () => {
      const longEmail = 'a'.repeat(60) + '@' + 'b'.repeat(60) + '.com';
      
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: longEmail, name: 'Test User' }
      });

      const request = createMockRequest({
        body: {
          email: longEmail,
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!'
        }
      });
      
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockAuthService.register).toHaveBeenCalledWith(longEmail, 'SecurePassword123!');
    });
  });
});
