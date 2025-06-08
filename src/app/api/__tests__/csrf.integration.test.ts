// Integration tests for CSRF token API
import { NextRequest } from 'next/server';
import { GET as csrfGET, OPTIONS as csrfOPTIONS } from '@/app/api/csrf/route';

// Mock dependencies
jest.mock('@/lib/security', () => ({
  generateCSRFToken: jest.fn(),
  addSecurityHeaders: jest.fn(),
  handleCORSPreflight: jest.fn(),
  validateOrigin: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  generalRateLimit: { requests: 10, duration: 60000 },
  createRateLimitIdentifier: jest.fn(),
  checkRateLimit: jest.fn(),
}));

import { 
  generateCSRFToken, 
  addSecurityHeaders, 
  handleCORSPreflight, 
  validateOrigin 
} from '@/lib/security';
import { 
  createRateLimitIdentifier, 
  checkRateLimit 
} from '@/lib/rate-limit';

const mockGenerateCSRF = generateCSRFToken as jest.Mock;
const mockAddSecurityHeaders = addSecurityHeaders as jest.Mock;
const mockHandleCORS = handleCORSPreflight as jest.Mock;
const mockValidateOrigin = validateOrigin as jest.Mock;
const mockCreateRateLimitId = createRateLimitIdentifier as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

describe('CSRF Token API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockCreateRateLimitId.mockReturnValue('csrf_token_127.0.0.1');
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      headers: {},
    });
    mockValidateOrigin.mockReturnValue(true);
    mockGenerateCSRF.mockReturnValue('csrf-token-123');
  });

  describe('GET /api/csrf', () => {
    describe('✅ Success Cases', () => {
      test('should generate and return CSRF token with valid request', async () => {
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: {
            'origin': 'https://localhost:3000',
            'user-agent': 'Test Browser',
          },
        });

        const response = await csrfGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          token: 'csrf-token-123',
        });
        expect(mockGenerateCSRF).toHaveBeenCalled();
        expect(mockAddSecurityHeaders).toHaveBeenCalled();
      });

      test('should handle multiple CSRF token requests within rate limit', async () => {
        const requests = Array.from({ length: 5 }, () => 
          new NextRequest('https://localhost:3000/api/csrf', {
            method: 'GET',
            headers: { 'origin': 'https://localhost:3000' },
          })
        );

        for (const request of requests) {
          const response = await csrfGET(request);
          expect(response.status).toBe(200);
        }

        expect(mockCheckRateLimit).toHaveBeenCalledTimes(5);
      });

      test('should validate origin for allowed domains', async () => {
        const allowedOrigins = [
          'https://localhost:3000',
          'https://secureshare.com',
          'https://www.secureshare.com',
        ];

        for (const origin of allowedOrigins) {
          const request = new NextRequest('https://localhost:3000/api/csrf', {
            method: 'GET',
            headers: { 'origin': origin },
          });

          const response = await csrfGET(request);
          expect(response.status).toBe(200);
        }
      });
    });

    describe('❌ Error Cases', () => {
      test('should handle rate limit exceeded', async () => {
        mockCheckRateLimit.mockResolvedValueOnce({
          success: false,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1234567890',
          },
        });

        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: { 'origin': 'https://localhost:3000' },
        });

        const response = await csrfGET(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toBe('Too many requests. Please try again later.');
        expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      });

      test('should reject invalid origin', async () => {
        mockValidateOrigin.mockReturnValueOnce(false);

        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: { 'origin': 'https://malicious-site.com' },
        });

        const response = await csrfGET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid origin');
      });

      test('should handle missing origin header', async () => {
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
        });

        // This should still work for same-origin requests
        const response = await csrfGET(request);
        expect(response.status).toBe(200);
      });

      test('should handle CSRF token generation failure', async () => {
        mockGenerateCSRF.mockImplementationOnce(() => {
          throw new Error('CSRF generation failed');
        });

        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: { 'origin': 'https://localhost:3000' },
        });

        const response = await csrfGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to generate CSRF token');
      });
    });

    describe('🔒 Security Features', () => {
      test('should apply security headers to all responses', async () => {
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: { 'origin': 'https://localhost:3000' },
        });

        await csrfGET(request);
        expect(mockAddSecurityHeaders).toHaveBeenCalled();
      });

      test('should validate rate limiting with proper identifier', async () => {
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: { 
            'origin': 'https://localhost:3000',
            'x-forwarded-for': '192.168.1.100',
          },
        });

        await csrfGET(request);
        
        expect(mockCreateRateLimitId).toHaveBeenCalledWith(
          request,
          'csrf_token'
        );
        expect(mockCheckRateLimit).toHaveBeenCalled();
      });

      test('should handle concurrent requests properly', async () => {
        const promises = Array.from({ length: 10 }, () => {
          const request = new NextRequest('https://localhost:3000/api/csrf', {
            method: 'GET',
            headers: { 'origin': 'https://localhost:3000' },
          });
          return csrfGET(request);
        });

        const responses = await Promise.all(promises);
        
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        expect(mockCheckRateLimit).toHaveBeenCalledTimes(10);
      });
    });

    describe('🎯 Edge Cases', () => {
      test('should handle malformed requests', async () => {
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: {
            'origin': 'not-a-valid-url',
          },
        });

        const response = await csrfGET(request);
        // Should still work or handle gracefully
        expect([200, 403]).toContain(response.status);
      });

      test('should handle very long origin headers', async () => {
        const longOrigin = 'https://' + 'a'.repeat(1000) + '.com';
        
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: { 'origin': longOrigin },
        });

        const response = await csrfGET(request);
        expect([200, 403, 400]).toContain(response.status);
      });

      test('should handle request with special characters in headers', async () => {
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: {
            'origin': 'https://localhost:3000',
            'user-agent': 'Test/1.0 (Special; Characters; ñ=ü)',
          },
        });

        const response = await csrfGET(request);
        expect(response.status).toBe(200);
      });
    });
  });

  describe('OPTIONS /api/csrf', () => {
    describe('✅ CORS Preflight Handling', () => {
      test('should handle valid CORS preflight request', async () => {
        const mockResponse = new Response(null, { status: 200 });
        mockHandleCORS.mockReturnValueOnce(mockResponse);

        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'OPTIONS',
          headers: {
            'origin': 'https://localhost:3000',
            'access-control-request-method': 'GET',
          },
        });

        const response = await csrfOPTIONS(request);

        expect(response.status).toBe(200);
        expect(mockHandleCORS).toHaveBeenCalledWith(request);
        expect(mockAddSecurityHeaders).toHaveBeenCalled();
      });

      test('should reject invalid CORS preflight request', async () => {
        mockHandleCORS.mockReturnValueOnce(null);

        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'OPTIONS',
          headers: {
            'origin': 'https://malicious-site.com',
          },
        });

        const response = await csrfOPTIONS(request);

        expect(response.status).toBe(405);
        expect(mockHandleCORS).toHaveBeenCalledWith(request);
      });

      test('should apply security headers to CORS responses', async () => {
        const mockResponse = new Response(null, { status: 200 });
        mockHandleCORS.mockReturnValueOnce(mockResponse);

        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'OPTIONS',
          headers: {
            'origin': 'https://localhost:3000',
            'access-control-request-method': 'GET',
          },
        });

        await csrfOPTIONS(request);
        expect(mockAddSecurityHeaders).toHaveBeenCalledWith(mockResponse);
      });
    });
  });

  describe('🔄 Integration Scenarios', () => {
    test('should handle complete CSRF token workflow', async () => {
      // 1. Preflight request
      const preflightRequest = new NextRequest('https://localhost:3000/api/csrf', {
        method: 'OPTIONS',
        headers: {
          'origin': 'https://localhost:3000',
          'access-control-request-method': 'GET',
        },
      });

      mockHandleCORS.mockReturnValueOnce(new Response(null, { status: 200 }));
      const preflightResponse = await csrfOPTIONS(preflightRequest);
      expect(preflightResponse.status).toBe(200);

      // 2. Actual CSRF token request
      const tokenRequest = new NextRequest('https://localhost:3000/api/csrf', {
        method: 'GET',
        headers: { 'origin': 'https://localhost:3000' },
      });

      const tokenResponse = await csrfGET(tokenRequest);
      const tokenData = await tokenResponse.json();

      expect(tokenResponse.status).toBe(200);
      expect(tokenData.token).toBe('csrf-token-123');
    });

    test('should handle rate limiting across multiple IPs', async () => {
      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      
      for (const ip of ips) {
        mockCreateRateLimitId.mockReturnValueOnce(`csrf_token_${ip}`);
        
        const request = new NextRequest('https://localhost:3000/api/csrf', {
          method: 'GET',
          headers: {
            'origin': 'https://localhost:3000',
            'x-forwarded-for': ip,
          },
        });

        const response = await csrfGET(request);
        expect(response.status).toBe(200);
      }

      expect(mockCheckRateLimit).toHaveBeenCalledTimes(3);
    });
  });
});
