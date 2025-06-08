// Integration tests for auth reset password endpoint

import { NextRequest } from 'next/server';
import { POST, GET } from '../auth/reset-password/route';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, sanitizeInput, validatePassword } from '@/lib/security';
import { checkRateLimit, createRateLimitIdentifier } from '@/lib/rate-limit';

// Mock dependencies
jest.mock('@/lib/auth-enhanced');
jest.mock('@/lib/security');
jest.mock('@/lib/rate-limit');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockAddSecurityHeaders = addSecurityHeaders as jest.MockedFunction<typeof addSecurityHeaders>;
const mockSanitizeInput = sanitizeInput as jest.MockedFunction<typeof sanitizeInput>;
const mockValidatePassword = validatePassword as jest.MockedFunction<typeof validatePassword>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockCreateRateLimitIdentifier = createRateLimitIdentifier as jest.MockedFunction<typeof createRateLimitIdentifier>;

// Test helper to create mock requests
function createMockRequest(options: {
  body?: any;
  token?: string;
  method?: string;
  ip?: string;
  url?: string;
} = {}): NextRequest {
  const {
    body = {
      token: 'valid-reset-token-123',
      newPassword: 'NewSecurePassword123!'
    },
    token,
    method = 'POST',
    ip = '127.0.0.1',
    url = 'http://localhost:3000/api/auth/reset-password'
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

describe('/api/auth/reset-password - Password Reset API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '4',
        'X-RateLimit-Reset': new Date(Date.now() + 900000).toISOString()
      }
    });

    mockCreateRateLimitIdentifier.mockReturnValue('reset_password:127.0.0.1');
    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockSanitizeInput.mockImplementation((input) => input);
    mockValidatePassword.mockReturnValue({
      isValid: true,
      errors: []
    });
  });

  describe('POST /api/auth/reset-password - Password Reset', () => {
    describe('Successful Password Reset', () => {
      test('should reset password successfully with valid token and password', async () => {
        const mockResetResult = {
          success: true,
          user: { id: 'user123', email: 'test@example.com' }
        };
        
        mockAuthService.resetPassword.mockResolvedValue(mockResetResult);
        
        const request = createMockRequest();
        const response = await POST(request);

        expect(mockCreateRateLimitIdentifier).toHaveBeenCalledWith(request, 'reset_password');
        expect(mockCheckRateLimit).toHaveBeenCalledWith(
          request,
          {
            windowMs: 900000,
            max: 5,
            message: 'Too many password reset attempts'
          },
          'reset_password:127.0.0.1'
        );

        expect(mockSanitizeInput).toHaveBeenCalledWith('valid-reset-token-123');
        expect(mockValidatePassword).toHaveBeenCalledWith('NewSecurePassword123!');
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token-123', 'NewSecurePassword123!');
        
        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          success: true,
          message: 'Password reset successfully. You can now login with your new password.'
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

        mockAuthService.resetPassword.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com' }
        });

        for (const token of testTokens) {
          jest.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({
            success: true,
            headers: {
              'X-RateLimit-Limit': '5',
              'X-RateLimit-Remaining': '4',
              'X-RateLimit-Reset': new Date(Date.now() + 900000).toISOString()
            }
          });
          mockValidatePassword.mockReturnValue({ isValid: true, errors: [] });
          
          const request = createMockRequest({
            body: { token, newPassword: 'NewSecurePassword123!' }
          });
          
          const response = await POST(request);
          
          expect(response.status).toBe(200);
          expect(mockSanitizeInput).toHaveBeenCalledWith(token);
          expect(mockAuthService.resetPassword).toHaveBeenCalledWith(token, 'NewSecurePassword123!');
        }
      });

      test('should preserve special characters in passwords', async () => {
        const passwordWithSpecialChars = 'P@$$w0rd!#$%^&*()';
        
        mockAuthService.resetPassword.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com' }
        });
        
        const request = createMockRequest({
          body: {
            token: 'valid-reset-token',
            newPassword: passwordWithSpecialChars
          }
        });
        
        await POST(request);

        // Password should not be sanitized (special chars preserved)
        expect(mockSanitizeInput).not.toHaveBeenCalledWith(passwordWithSpecialChars);
        expect(mockValidatePassword).toHaveBeenCalledWith(passwordWithSpecialChars);
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token', passwordWithSpecialChars);
      });
    });

    describe('Input Validation', () => {
      test('should reject requests with missing token', async () => {
        const request = createMockRequest({
          body: { newPassword: 'NewSecurePassword123!' }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Validation failed',
          details: expect.any(Array)
        });

        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should reject requests with missing password', async () => {
        const request = createMockRequest({
          body: { token: 'valid-reset-token' }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
      });

      test('should reject tokens that are too short', async () => {
        const request = createMockRequest({
          body: {
            token: 'short',
            newPassword: 'NewSecurePassword123!'
          }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
      });

      test('should reject tokens that are too long', async () => {
        const longToken = 'a'.repeat(129); // 129 characters, exceeds max of 128
        
        const request = createMockRequest({
          body: {
            token: longToken,
            newPassword: 'NewSecurePassword123!'
          }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
      });

      test('should reject passwords that are too short', async () => {
        const request = createMockRequest({
          body: {
            token: 'valid-reset-token-123',
            newPassword: 'short'
          }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
      });

      test('should reject passwords that are too long', async () => {
        const longPassword = 'a'.repeat(129); // 129 characters, exceeds max of 128
        
        const request = createMockRequest({
          body: {
            token: 'valid-reset-token-123',
            newPassword: longPassword
          }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data.error).toBe('Validation failed');
        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
      });

      test('should sanitize token input against XSS', async () => {
        mockSanitizeInput.mockReturnValue('sanitized-token');
        mockAuthService.resetPassword.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com' }
        });
        
        const request = createMockRequest({
          body: {
            token: '<script>alert("xss")</script>malicious-token',
            newPassword: 'NewSecurePassword123!'
          }
        });
        
        await POST(request);

        expect(mockSanitizeInput).toHaveBeenCalledWith('<script>alert("xss")</script>malicious-token');
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith('sanitized-token', 'NewSecurePassword123!');
      });
    });

    describe('Password Validation', () => {
      test('should reject weak passwords', async () => {
        mockValidatePassword.mockReturnValue({
          isValid: false,
          errors: [
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must be at least 8 characters long'
          ]
        });

        const request = createMockRequest({
          body: {
            token: 'valid-reset-token',
            newPassword: 'weak'
          }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Password does not meet requirements',
          details: [
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must be at least 8 characters long'
          ]
        });

        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
      });

      test('should accept strong passwords', async () => {
        const strongPasswords = [
          'StrongPassword123!',
          'AnotherGood1@Password',
          'Complex$Pass2023',
          'Secure!Password123'
        ];

        mockAuthService.resetPassword.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com' }
        });

        for (const password of strongPasswords) {
          jest.clearAllMocks();
          mockCheckRateLimit.mockResolvedValue({
            success: true,
            headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '4', 'X-RateLimit-Reset': '' }
          });
          mockValidatePassword.mockReturnValue({ isValid: true, errors: [] });
          
          const request = createMockRequest({
            body: {
              token: 'valid-reset-token',
              newPassword: password
            }
          });
          
          const response = await POST(request);
          
          expect(response.status).toBe(200);
          expect(mockValidatePassword).toHaveBeenCalledWith(password);
          expect(mockAuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token', password);
        }
      });

      test('should validate password complexity requirements', async () => {
        mockValidatePassword.mockReturnValue({
          isValid: false,
          errors: ['Password must contain special characters']
        });

        const request = createMockRequest({
          body: {
            token: 'valid-reset-token',
            newPassword: 'SimplePassword123'
          }
        });
        
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Password does not meet requirements',
          details: ['Password must contain special characters']
        });
      });
    });

    describe('Rate Limiting', () => {
      test('should enforce rate limits for reset attempts', async () => {
        mockCheckRateLimit.mockResolvedValue({
          success: false,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 900000).toISOString()
          }
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(429);
        expect(response.data).toEqual({
          error: 'Too many password reset attempts. Please try again later.'
        });

        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));

        expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should create proper rate limit identifiers', async () => {
        const request = createMockRequest();
        await POST(request);

        expect(mockCreateRateLimitIdentifier).toHaveBeenCalledWith(request, 'reset_password');
        expect(mockCheckRateLimit).toHaveBeenCalledWith(
          request,
          {
            windowMs: 900000, // 15 minutes
            max: 5,
            message: 'Too many password reset attempts'
          },
          'reset_password:127.0.0.1'
        );
      });

      test('should include rate limit headers in successful responses', async () => {
        mockAuthService.resetPassword.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com' }
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      });

      test('should handle rate limit service failures', async () => {
        mockCheckRateLimit.mockRejectedValue(new Error('Rate limit service unavailable'));

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(response.data).toEqual({
          error: 'Internal server error'
        });
      });
    });

    describe('Authentication Service Integration', () => {
      test('should handle expired reset tokens', async () => {
        mockAuthService.resetPassword.mockResolvedValue({
          success: false,
          error: 'Reset token has expired'
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Reset token has expired'
        });

        expect(mockAuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token-123', 'NewSecurePassword123!');
      });

      test('should handle invalid reset tokens', async () => {
        mockAuthService.resetPassword.mockResolvedValue({
          success: false,
          error: 'Invalid reset token'
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Invalid reset token'
        });
      });

      test('should handle already used tokens', async () => {
        mockAuthService.resetPassword.mockResolvedValue({
          success: false,
          error: 'Reset token has already been used'
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Reset token has already been used'
        });
      });

      test('should handle service errors without specific error message', async () => {
        mockAuthService.resetPassword.mockResolvedValue({
          success: false
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Password reset failed'
        });
      });

      test('should handle service exceptions', async () => {
        mockAuthService.resetPassword.mockRejectedValue(new Error('Database connection failed'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(response.data).toEqual({
          error: 'Internal server error'
        });

        expect(consoleSpy).toHaveBeenCalledWith('Password reset error:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });

      test('should handle password hashing failures', async () => {
        mockAuthService.resetPassword.mockResolvedValue({
          success: false,
          error: 'Failed to hash new password'
        });

        const request = createMockRequest();
        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Failed to hash new password'
        });
      });
    });
  });

  describe('GET /api/auth/reset-password - Token Validation', () => {
    describe('Successful Token Validation', () => {
      test('should validate token successfully via GET request', async () => {
        const token = 'valid-get-reset-token';
        
        const request = createMockRequest({
          method: 'GET',
          token,
          url: 'http://localhost:3000/api/auth/reset-password'
        });
        
        const response = await GET(request);

        expect(mockCreateRateLimitIdentifier).toHaveBeenCalledWith(request, 'reset_password_get');
        expect(mockCheckRateLimit).toHaveBeenCalledWith(
          request,
          {
            windowMs: 900000,
            max: 5,
            message: 'Too many password reset attempts'
          },
          'reset_password:127.0.0.1'
        );

        expect(mockSanitizeInput).toHaveBeenCalledWith(token);
        
        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          success: true,
          message: 'Token is valid. You can proceed with password reset.',
          token: token // Sanitized token returned
        });

        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        expect(response.headers.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));

        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should handle URL encoded tokens correctly', async () => {
        const encodedToken = 'token%2Bwith%2Bplus%2Bsigns';
        const decodedToken = 'token+with+plus+signs';
        
        const request = createMockRequest({
          method: 'GET',
          token: encodedToken,
          url: 'http://localhost:3000/api/auth/reset-password'
        });
        
        await GET(request);

        expect(mockSanitizeInput).toHaveBeenCalledWith(decodedToken);
      });

      test('should return sanitized token in response', async () => {
        const maliciousToken = '<script>alert("xss")</script>token';
        const sanitizedToken = 'clean-token';
        
        mockSanitizeInput.mockReturnValue(sanitizedToken);
        
        const request = createMockRequest({
          method: 'GET',
          token: maliciousToken,
          url: 'http://localhost:3000/api/auth/reset-password'
        });
        
        const response = await GET(request);

        expect(response.data.token).toBe(sanitizedToken);
        expect(mockSanitizeInput).toHaveBeenCalledWith(maliciousToken);
      });
    });

    describe('GET Request Validation', () => {
      test('should reject GET requests without token parameter', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/auth/reset-password'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Reset token is required'
        });

        expect(mockCheckRateLimit).not.toHaveBeenCalled();
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(response);
      });

      test('should reject GET requests with empty token parameter', async () => {
        const request = createMockRequest({
          method: 'GET',
          token: '',
          url: 'http://localhost:3000/api/auth/reset-password'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          error: 'Reset token is required'
        });
      });

      test('should sanitize query parameter tokens', async () => {
        const maliciousToken = '<script>alert("xss")</script>token';
        
        mockSanitizeInput.mockReturnValue('sanitized-get-token');

        const request = createMockRequest({
          method: 'GET',
          token: maliciousToken,
          url: 'http://localhost:3000/api/auth/reset-password'
        });
        
        await GET(request);

        expect(mockSanitizeInput).toHaveBeenCalledWith(maliciousToken);
      });
    });

    describe('GET Rate Limiting', () => {
      test('should enforce separate rate limits for GET requests', async () => {
        mockCheckRateLimit.mockResolvedValue({
          success: false,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 900000).toISOString()
          }
        });

        const request = createMockRequest({
          method: 'GET',
          token: 'valid-token'
        });
        
        const response = await GET(request);

        expect(response.status).toBe(429);
        expect(response.data).toEqual({
          error: 'Too many password reset attempts. Please try again later.'
        });

        expect(mockCreateRateLimitIdentifier).toHaveBeenCalledWith(request, 'reset_password_get');
      });

      test('should track separate rate limits for GET and POST', async () => {
        mockAuthService.resetPassword.mockResolvedValue({
          success: true,
          user: { id: 'user123', email: 'test@example.com' }
        });

        const postRequest = createMockRequest({
          method: 'POST',
          body: { token: 'post-token', newPassword: 'NewPassword123!' }
        });
        
        const getRequest = createMockRequest({
          method: 'GET',
          token: 'get-token'
        });

        await POST(postRequest);
        await GET(getRequest);

        expect(mockCreateRateLimitIdentifier).toHaveBeenCalledWith(postRequest, 'reset_password');
        expect(mockCreateRateLimitIdentifier).toHaveBeenCalledWith(getRequest, 'reset_password_get');
      });
    });

    describe('GET Error Handling', () => {
      test('should handle rate limit service errors in GET requests', async () => {
        mockCheckRateLimit.mockRejectedValue(new Error('Service unavailable'));

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

        expect(consoleSpy).toHaveBeenCalledWith('Password reset token validation error:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });

      test('should handle general exceptions in GET requests', async () => {
        const request = createMockRequest({
          method: 'GET',
          token: 'test-token'
        });
        
        // Mock URL constructor to throw
        const originalURL = global.URL;
        global.URL = jest.fn().mockImplementation(() => {
          throw new Error('Invalid URL');
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(consoleSpy).toHaveBeenCalled();
        
        global.URL = originalURL;
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Security Headers', () => {
    test('should apply security headers to all POST responses', async () => {
      const scenarios = [
        { 
          setup: () => {
            mockAuthService.resetPassword.mockResolvedValue({
              success: true,
              user: { id: 'user123', email: 'test@example.com' }
            });
          },
          expected: 200
        },
        { 
          setup: () => {
            mockCheckRateLimit.mockResolvedValue({
              success: false,
              headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '' }
            });
          },
          expected: 429
        },
        { 
          setup: () => {
            mockValidatePassword.mockReturnValue({
              isValid: false,
              errors: ['Password too weak']
            });
          },
          expected: 400
        },
        { 
          setup: () => {
            mockAuthService.resetPassword.mockRejectedValue(new Error('Service error'));
          },
          expected: 500
        }
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        mockCheckRateLimit.mockResolvedValue({
          success: true,
          headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '4', 'X-RateLimit-Reset': '' }
        });
        mockValidatePassword.mockReturnValue({ isValid: true, errors: [] });
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
          setup: () => {},
          expected: 200
        },
        { 
          setup: () => {
            mockCheckRateLimit.mockResolvedValue({
              success: false,
              headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '' }
            });
          },
          expected: 429
        },
        { 
          setup: () => {
            mockCheckRateLimit.mockRejectedValue(new Error('Service error'));
          },
          expected: 500
        }
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        mockCheckRateLimit.mockResolvedValue({
          success: true,
          headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '4', 'X-RateLimit-Reset': '' }
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
    test('should handle concurrent reset attempts', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com' }
      });

      const requests = Array.from({ length: 3 }, (_, i) => 
        createMockRequest({
          body: {
            token: `concurrent-token-${i}`,
            newPassword: 'NewSecurePassword123!'
          }
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockAuthService.resetPassword).toHaveBeenCalledTimes(3);
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

    test('should maintain performance under load', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com' }
      });

      const requests = Array.from({ length: 10 }, () => createMockRequest());

      const startTime = Date.now();
      await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle mixed GET and POST requests correctly', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com' }
      });

      const postRequest = createMockRequest({
        method: 'POST',
        body: { token: 'post-reset-token', newPassword: 'NewPassword123!' }
      });
      
      const getRequest = createMockRequest({
        method: 'GET',
        token: 'get-reset-token'
      });

      const [postResponse, getResponse] = await Promise.all([
        POST(postRequest),
        GET(getRequest)
      ]);

      expect(postResponse.status).toBe(200);
      expect(getResponse.status).toBe(200);
      
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('post-reset-token', 'NewPassword123!');
      expect(mockSanitizeInput).toHaveBeenCalledWith('get-reset-token');
    });

    test('should handle extreme password lengths', async () => {
      const extremePassword = 'A1!' + 'a'.repeat(125); // 128 characters total
      
      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com' }
      });

      const request = createMockRequest({
        body: {
          token: 'valid-reset-token',
          newPassword: extremePassword
        }
      });
      
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockValidatePassword).toHaveBeenCalledWith(extremePassword);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token', extremePassword);
    });
  });
});
