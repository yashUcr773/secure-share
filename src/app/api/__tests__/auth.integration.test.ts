// Integration tests for authentication API endpoints
import { NextRequest, NextResponse } from 'next/server';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { GET as mePOST } from '@/app/api/auth/me/route';

// Mock external dependencies
jest.mock('@/lib/auth-enhanced', () => ({
  AuthService: {
    login: jest.fn(),
    register: jest.fn(),
    verifyToken: jest.fn(),
  },
}));

jest.mock('@/lib/security', () => ({
  validateCSRFToken: jest.fn(() => true),
  logSecurityEvent: jest.fn(),
  getClientIP: jest.fn(() => '127.0.0.1'),
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimitAuthAttempts: jest.fn(),
}));

import { AuthService } from '@/lib/auth-enhanced';
import { validateCSRFToken, logSecurityEvent } from '@/lib/security';
import { rateLimitAuthAttempts } from '@/lib/rate-limit';

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockValidateCSRF = validateCSRFToken as jest.Mock;
const mockRateLimit = rateLimitAuthAttempts as jest.Mock;
const mockLogSecurityEvent = logSecurityEvent as jest.Mock;

describe('Authentication API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateCSRF.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'valid-jwt-token',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual(mockUser);
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should fail with invalid credentials', async () => {
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid email or password');
    });

    it('should fail without CSRF token', async () => {
      mockValidateCSRF.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid CSRF token');
    });

    it('should fail with rate limiting', async () => {
      mockRateLimit.mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: new Date(Date.now() + 15 * 60 * 1000),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many login attempts. Please try again later.');
    });

    it('should handle missing email or password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          // missing password
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should register successfully with valid data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAuthService.register.mockResolvedValue({
        success: true,
        user: mockUser,
        requiresVerification: true,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          name: 'Test User',
        }),
      });

      const response = await signupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user).toEqual(mockUser);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User'
      );
    });

    it('should fail with mismatched passwords', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'differentpassword',
          name: 'Test User',
        }),
      });

      const response = await signupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Passwords do not match');
    });

    it('should fail with existing email', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'User with this email already exists',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          name: 'Test User',
        }),
      });

      const response = await signupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('User with this email already exists');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data with valid token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAuthService.verifyToken.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      const response = await mePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual(mockUser);
    });

    it('should fail with invalid token', async () => {
      mockAuthService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: 'token=invalid-token',
        },
      });

      const response = await mePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should fail without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });

      const response = await mePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
