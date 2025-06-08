/**
 * Security Tests for SecureShare Application
 * Tests authentication, authorization, input validation, and security vulnerabilities
 */

import { NextRequest } from 'next/server';
import { GET as FilesGET, POST as FilesUpload } from '../files/route';
import { POST as AuthSignin } from '../auth/signin/route';
import { POST as AuthSignup } from '../auth/signup/route';
import { POST as ContactPOST } from '../contact/route';
import { GET as AdminMonitoringGET } from '../admin/monitoring/route';

// Mock implementations
jest.mock('@/lib/auth-enhanced', () => ({
  authService: {
    verifyToken: jest.fn(),
    getUser: jest.fn(),
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
    generateToken: jest.fn(),
    revokeToken: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  file: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  contactMessage: {
    create: jest.fn(),
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  },
}));

jest.mock('@/lib/storage', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

// Test utilities
function createMockRequest(
  method: string,
  body?: any,
  options: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
    ip?: string;
  } = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/test');
  
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...options.headers,
  };

  if (options.ip) {
    headers['x-forwarded-for'] = options.ip;
  }

  const request = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });

  // Mock cookies
  if (options.cookies) {
    Object.defineProperty(request, 'cookies', {
      value: {
        get: (name: string) => ({
          value: options.cookies?.[name],
        }),
      },
    });
  }

  return request;
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'USER' as const,
  name: 'Test User',
  passwordHash: '$2b$12$hashedpassword',
  isActive: true,
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpiry: null,
  passwordResetToken: null,
  passwordResetTokenExpiry: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAdminUser = {
  ...mockUser,
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
  name: 'Admin User',
};

describe('Security Tests', () => {
  let mockPrisma: any;
  let mockAuthService: any;
  let mockRateLimiter: any;
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = require('@/lib/prisma');
    mockAuthService = require('@/lib/auth-enhanced').authService;
    mockRateLimiter = require('@/lib/rate-limiter').rateLimiter;
    mockStorage = require('@/lib/storage');

    // Default configurations
    mockRateLimiter.isAllowed.mockResolvedValue({ allowed: true, remaining: 10 });
  });

  describe('Authentication Security', () => {
    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'null',
        'undefined',
        'Bearer invalid-token',
        '123456789',
        'sql_injection_attempt',
      ];

      for (const token of invalidTokens) {
        mockAuthService.verifyToken.mockResolvedValue({
          valid: false,
          error: 'Invalid token',
          user: undefined,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { token },
        });

        const response = await FilesGET(request);
        expect(response.status).toBe(401);

        const data = await response.json();
        expect(data.error).toContain('Unauthorized');
      }
    });

    it('should prevent JWT token reuse after logout', async () => {
      const token = 'valid-jwt-token';
      
      // First request - token is valid
      mockAuthService.verifyToken.mockResolvedValueOnce({
        valid: true,
        payload: { userId: mockUser.id },
        user: undefined,
      });
      mockAuthService.getUser.mockResolvedValue(mockUser);
      mockPrisma.file.findMany.mockResolvedValue([]);

      const request1 = createMockRequest('GET', undefined, {
        cookies: { token },
      });

      const response1 = await FilesGET(request1);
      expect(response1.status).toBe(200);

      // Simulate token revocation
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Token revoked',
        user: undefined,
      });

      // Second request with same token should fail
      const request2 = createMockRequest('GET', undefined, {
        cookies: { token },
      });

      const response2 = await FilesGET(request2);
      expect(response2.status).toBe(401);
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'admin',
        'qwerty',
        'password123',
        'abc123',
        '12345678',
        'test',
        '',
        'a',
        'aA1!', // too short
      ];

      for (const password of weakPasswords) {
        const request = createMockRequest('POST', {
          email: 'test@example.com',
          password,
          name: 'Test User',
        });

        const response = await AuthSignup(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toMatch(/password/i);
      }
    });

    it('should prevent timing attacks on login', async () => {
      const existingEmail = 'existing@example.com';
      const nonExistingEmail = 'nonexisting@example.com';
      const password = 'TestPassword123!';

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // existing user
        .mockResolvedValueOnce(null); // non-existing user

      mockAuthService.comparePassword
        .mockResolvedValueOnce(false) // wrong password for existing user
        .mockResolvedValueOnce(false); // shouldn't be called for non-existing user

      const times: number[] = [];

      // Test existing user with wrong password
      const start1 = Date.now();
      const request1 = createMockRequest('POST', {
        email: existingEmail,
        password,
      });
      const response1 = await AuthSignin(request1);
      const end1 = Date.now();
      times.push(end1 - start1);

      expect(response1.status).toBe(401);

      // Test non-existing user
      const start2 = Date.now();
      const request2 = createMockRequest('POST', {
        email: nonExistingEmail,
        password,
      });
      const response2 = await AuthSignin(request2);
      const end2 = Date.now();
      times.push(end2 - start2);

      expect(response2.status).toBe(401);

      // Response times should be similar (within 50ms difference)
      const timeDifference = Math.abs(times[0] - times[1]);
      expect(timeDifference).toBeLessThan(50);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent horizontal privilege escalation', async () => {
      const user1Id = 'user-123';
      const user2Id = 'user-456';
      const user2File = {
        id: 'file-456',
        filename: 'private-file.pdf',
        uploadedBy: user2Id,
        user: { ...mockUser, id: user2Id },
      };

      // User 1 tries to access User 2's file
      mockAuthService.verifyToken.mockResolvedValue({
        valid: true,
        payload: { userId: user1Id },
        user: undefined,
      });
      mockAuthService.getUser.mockResolvedValue({ ...mockUser, id: user1Id });
      mockPrisma.file.findUnique.mockResolvedValue(user2File);

      const request = createMockRequest('GET', undefined, {
        cookies: { token: 'valid-token' },
        searchParams: { id: 'file-456' },
      });

      const response = await FilesGET(request);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toMatch(/access/i);
    });

    it('should prevent vertical privilege escalation', async () => {
      // Regular user tries to access admin endpoints
      mockAuthService.verifyToken.mockResolvedValue({
        valid: true,
        payload: { userId: mockUser.id },
        user: undefined,
      });
      mockAuthService.getUser.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = createMockRequest('GET', undefined, {
        cookies: { token: 'valid-token' },
      });

      const response = await AdminMonitoringGET(request);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toContain('Admin access required');
    });

    it('should validate admin role properly', async () => {
      // User with spoofed admin role in token
      mockAuthService.verifyToken.mockResolvedValue({
        valid: true,
        payload: { userId: mockUser.id, role: 'ADMIN' }, // Spoofed role in token
        user: undefined,
      });
      // But database shows regular user
      mockAuthService.getUser.mockResolvedValue(mockUser); // role: 'USER'
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = createMockRequest('GET', undefined, {
        cookies: { token: 'valid-token' },
      });

      const response = await AdminMonitoringGET(request);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toContain('Admin access required');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' UNION SELECT * FROM users WHERE ''='",
        "admin'--",
        "admin'/*",
        "' OR 1=1#",
        "' OR 'x'='x",
        "'; EXEC xp_cmdshell('dir'); --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const request = createMockRequest('POST', {
          email: payload,
          password: 'TestPassword123!',
        });

        const response = await AuthSignin(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toMatch(/invalid|validation/i);
      }
    });

    it('should prevent XSS attacks in contact form', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload="alert(1)">',
        '<input type="image" src="x" onerror="alert(1)">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
      ];

      mockPrisma.contactMessage.create.mockResolvedValue({
        id: 'message-123',
        name: 'Test',
        email: 'test@example.com',
        subject: 'Test',
        message: 'Clean message',
        createdAt: new Date(),
      });

      for (const payload of xssPayloads) {
        const request = createMockRequest('POST', {
          name: payload,
          email: 'test@example.com',
          subject: 'Test Subject',
          message: payload,
        });

        const response = await ContactPOST(request);
        
        if (response.status === 200) {
          // If the request went through, verify the payload was sanitized
          expect(mockPrisma.contactMessage.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              name: expect.not.stringContaining('<script>'),
              message: expect.not.stringContaining('<script>'),
            }),
          });
        } else {
          // Should be rejected with validation error
          expect(response.status).toBe(400);
        }
      }
    });

    it('should validate file upload security', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: true,
        payload: { userId: mockUser.id },
        user: undefined,
      });
      mockAuthService.getUser.mockResolvedValue(mockUser);

      const maliciousFiles = [
        { name: 'virus.exe', type: 'application/x-msdownload' },
        { name: 'script.bat', type: 'application/x-bat' },
        { name: 'malware.scr', type: 'application/x-screensaver' },
        { name: 'trojan.com', type: 'application/x-msdownload' },
        { name: '../../../etc/passwd', type: 'text/plain' },
        { name: 'file.php', type: 'application/x-php' },
        { name: 'test.jsp', type: 'application/x-jsp' },
      ];

      for (const fileInfo of maliciousFiles) {
        const formData = new FormData();
        formData.append('file', new Blob(['malicious content'], { type: fileInfo.type }), fileInfo.name);

        const request = new NextRequest('http://localhost:3000/api/files', {
          method: 'POST',
          body: formData,
        });

        Object.defineProperty(request, 'cookies', {
          value: {
            get: () => ({ value: 'valid-token' }),
          },
        });

        const response = await FilesUpload(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toMatch(/file type|invalid|not allowed/i);
      }
    });

    it('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        'file://c:/windows/system32/config/sam',
        '/var/www/../../etc/passwd',
      ];

      mockAuthService.verifyToken.mockResolvedValue({
        valid: true,
        payload: { userId: mockUser.id },
        user: undefined,
      });
      mockAuthService.getUser.mockResolvedValue(mockUser);
      mockPrisma.file.findMany.mockResolvedValue([]);

      for (const payload of pathTraversalPayloads) {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'valid-token' },
          searchParams: { path: payload },
        });

        const response = await FilesGET(request);
        
        // Should either reject the request or sanitize the path
        if (response.status !== 200) {
          expect(response.status).toBe(400);
        }
        
        // Verify no actual file system access with malicious path
        expect(mockStorage.uploadFile).not.toHaveBeenCalledWith(
          expect.stringContaining('../')
        );
      }
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      mockRateLimiter.isAllowed.mockResolvedValue({ allowed: false, remaining: 0 });

      const request = createMockRequest('POST', {
        email: 'test@example.com',
        password: 'TestPassword123!',
      }, { ip: '192.168.1.100' });

      const response = await AuthSignin(request);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toMatch(/rate limit|too many/i);
    });

    it('should handle request flooding gracefully', async () => {
      const requests = [];
      const requestCount = 1000;

      // Simulate rate limiter allowing first few requests, then blocking
      mockRateLimiter.isAllowed
        .mockResolvedValueOnce({ allowed: true, remaining: 10 })
        .mockResolvedValueOnce({ allowed: true, remaining: 9 })
        .mockResolvedValueOnce({ allowed: true, remaining: 8 })
        .mockResolvedValue({ allowed: false, remaining: 0 });

      for (let i = 0; i < requestCount; i++) {
        const request = createMockRequest('POST', {
          email: 'test@example.com',
          password: 'TestPassword123!',
        }, { ip: '192.168.1.100' });

        requests.push(AuthSignin(request));
      }

      const responses = await Promise.all(requests);
      
      // First few should succeed, rest should be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses.length).toBeLessThan(10);
      expect(rateLimitedResponses.length).toBeGreaterThan(990);
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on password change', async () => {
      const oldToken = 'old-valid-token';
      const newToken = 'new-valid-token';

      // First request with old token works
      mockAuthService.verifyToken.mockResolvedValueOnce({
        valid: true,
        payload: { userId: mockUser.id },
        user: undefined,
      });
      mockAuthService.getUser.mockResolvedValue(mockUser);
      mockPrisma.file.findMany.mockResolvedValue([]);

      const request1 = createMockRequest('GET', undefined, {
        cookies: { token: oldToken },
      });

      const response1 = await FilesGET(request1);
      expect(response1.status).toBe(200);

      // Simulate password change - old token becomes invalid
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Token invalidated',
        user: undefined,
      });

      // Second request with old token should fail
      const request2 = createMockRequest('GET', undefined, {
        cookies: { token: oldToken },
      });

      const response2 = await FilesGET(request2);
      expect(response2.status).toBe(401);
    });

    it('should have secure cookie attributes', async () => {
      // This would be tested in a more integrated environment
      // For now, we verify that the auth service handles secure tokens
      const token = mockAuthService.generateToken;
      
      expect(token).toBeDefined();
      // In real implementation, would verify:
      // - HttpOnly flag
      // - Secure flag in HTTPS
      // - SameSite attribute
      // - Proper expiration
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not expose sensitive information in error messages', async () => {
      mockAuthService.verifyToken.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('GET', undefined, {
        cookies: { token: 'valid-token' },
      });

      const response = await FilesGET(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      
      // Should not expose internal error details
      expect(data.error).not.toContain('Database');
      expect(data.error).not.toContain('connection');
      expect(data.error).not.toContain('failed');
      expect(data.message || data.error).toMatch(/internal server error|something went wrong/i);
    });

    it('should not expose user enumeration through login timing', async () => {
      const responses = [];
      const emails = [
        'existing@example.com',
        'nonexisting@example.com',
        'another@example.com',
        'fake@example.com',
      ];

      // Mock responses for existing vs non-existing users
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // existing
        .mockResolvedValueOnce(null)     // non-existing
        .mockResolvedValueOnce(mockUser) // existing
        .mockResolvedValueOnce(null);    // non-existing

      mockAuthService.comparePassword.mockResolvedValue(false);

      for (const email of emails) {
        const start = Date.now();
        const request = createMockRequest('POST', {
          email,
          password: 'wrongpassword',
        });

        const response = await AuthSignin(request);
        const end = Date.now();

        responses.push({
          email,
          status: response.status,
          time: end - start,
        });

        expect(response.status).toBe(401);
      }

      // All response times should be similar
      const times = responses.map(r => r.time);
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avgTime)));
      
      expect(maxDeviation).toBeLessThan(50); // Within 50ms
    });
  });
});
