// Integration tests for notification settings API
import { NextRequest } from 'next/server';
import { 
  PUT as notificationsPUT, 
  GET as notificationsGET,
  OPTIONS as notificationsOPTIONS 
} from '@/app/api/auth/notifications/route';

// Mock dependencies
jest.mock('@/lib/auth-enhanced', () => ({
  AuthService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('@/lib/database', () => ({
  UserService: {
    getUserNotificationSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
  },
}));

jest.mock('@/lib/rate-limit', () => ({
  generalRateLimit: { requests: 10, duration: 60000 },
  createRateLimitIdentifier: jest.fn(),
  checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/security', () => ({
  addSecurityHeaders: jest.fn(),
  validateOrigin: jest.fn(),
  handleCORSPreflight: jest.fn(),
  sanitizeInput: jest.fn(),
  validateCSRFWithSession: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  CacheService: {
    invalidateUserCache: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/lib/job-queue', () => ({
  jobQueue: {
    add: jest.fn(),
  },
}));

import { AuthService } from '@/lib/auth-enhanced';
import { UserService } from '@/lib/database';
import { createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { 
  addSecurityHeaders, 
  validateOrigin, 
  handleCORSPreflight, 
  sanitizeInput,
  validateCSRFWithSession 
} from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { jobQueue } from '@/lib/job-queue';

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockCreateRateLimitId = createRateLimitIdentifier as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockAddSecurityHeaders = addSecurityHeaders as jest.Mock;
const mockValidateOrigin = validateOrigin as jest.Mock;
const mockHandleCORS = handleCORSPreflight as jest.Mock;
const mockSanitizeInput = sanitizeInput as jest.Mock;
const mockValidateCSRF = validateCSRFWithSession as jest.Mock;
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
const mockJobQueue = jobQueue as jest.Mocked<typeof jobQueue>;

describe('Notification Settings API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const defaultNotificationSettings = {
    emailNotifications: true,
    shareNotifications: true,
    securityAlerts: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockValidateOrigin.mockReturnValue(true);
    mockSanitizeInput.mockImplementation((input) => input);
    mockValidateCSRF.mockResolvedValue(true);
    mockCreateRateLimitId.mockReturnValue('notifications-update_127.0.0.1');
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      headers: {},
    });
    
    mockAuthService.verifyToken.mockResolvedValue(mockUser);
    mockUserService.getUserNotificationSettings.mockResolvedValue(defaultNotificationSettings);
    mockCacheService.get.mockResolvedValue(null);
  });

  const createMockRequest = (method: string, body?: any, headers?: Record<string, string>) => {
    const requestOptions: RequestInit = {
      method,
      headers: {
        'content-type': 'application/json',
        'origin': 'https://localhost:3000',
        'cookie': 'auth-token=valid-token',
        'x-csrf-token': 'csrf-token-123',
        ...headers,
      },
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    return new NextRequest('https://localhost:3000/api/auth/notifications', requestOptions);
  };

  describe('GET /api/auth/notifications', () => {
    describe('✅ Success Cases', () => {
      test('should retrieve user notification settings', async () => {
        const request = createMockRequest('GET');
        const response = await notificationsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.settings).toEqual(defaultNotificationSettings);
        expect(mockUserService.getUserNotificationSettings).toHaveBeenCalledWith('user-123');
      });

      test('should return cached settings when available', async () => {
        const cachedSettings = {
          emailNotifications: false,
          shareNotifications: true,
          securityAlerts: true,
        };
        
        mockCacheService.get.mockResolvedValueOnce(cachedSettings);

        const request = createMockRequest('GET');
        const response = await notificationsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.settings).toEqual(cachedSettings);
        expect(mockUserService.getUserNotificationSettings).not.toHaveBeenCalled();
      });

      test('should handle first-time user with default settings', async () => {
        mockUserService.getUserNotificationSettings.mockResolvedValueOnce(null);

        const request = createMockRequest('GET');
        const response = await notificationsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.settings).toEqual({
          emailNotifications: true,
          shareNotifications: true,
          securityAlerts: true,
        });
      });
    });

    describe('❌ Error Cases', () => {
      test('should return 401 for unauthenticated request', async () => {
        mockAuthService.verifyToken.mockResolvedValueOnce(null);

        const request = createMockRequest('GET');
        const response = await notificationsGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      test('should handle database error gracefully', async () => {
        mockUserService.getUserNotificationSettings.mockRejectedValueOnce(
          new Error('Database connection failed')
        );

        const request = createMockRequest('GET');
        const response = await notificationsGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to retrieve notification settings');
      });

      test('should handle rate limiting', async () => {
        mockCheckRateLimit.mockResolvedValueOnce({
          success: false,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1234567890',
          },
        });

        const request = createMockRequest('GET');
        const response = await notificationsGET(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toContain('Too many notification');
      });
    });
  });

  describe('PUT /api/auth/notifications', () => {
    describe('✅ Success Cases', () => {
      test('should update all notification settings', async () => {
        const newSettings = {
          emailNotifications: false,
          shareNotifications: true,
          securityAlerts: false,
        };

        mockUserService.updateNotificationSettings.mockResolvedValueOnce(newSettings);

        const request = createMockRequest('PUT', newSettings);
        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.settings).toEqual(newSettings);
        expect(mockUserService.updateNotificationSettings).toHaveBeenCalledWith(
          'user-123',
          newSettings
        );
      });

      test('should update partial notification settings', async () => {
        const partialSettings = {
          emailNotifications: false,
        };

        const updatedSettings = {
          ...defaultNotificationSettings,
          emailNotifications: false,
        };

        mockUserService.updateNotificationSettings.mockResolvedValueOnce(updatedSettings);

        const request = createMockRequest('PUT', partialSettings);
        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.settings).toEqual(updatedSettings);
      });

      test('should invalidate cache after update', async () => {
        const newSettings = {
          emailNotifications: false,
          shareNotifications: true,
          securityAlerts: true,
        };

        mockUserService.updateNotificationSettings.mockResolvedValueOnce(newSettings);

        const request = createMockRequest('PUT', newSettings);
        await notificationsPUT(request);

        expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith('user-123');
      });

      test('should queue notification preference update job', async () => {
        const newSettings = {
          emailNotifications: false,
          shareNotifications: false,
          securityAlerts: true,
        };

        mockUserService.updateNotificationSettings.mockResolvedValueOnce(newSettings);

        const request = createMockRequest('PUT', newSettings);
        await notificationsPUT(request);

        expect(mockJobQueue.add).toHaveBeenCalledWith('notification-preferences-updated', {
          userId: 'user-123',
          settings: newSettings,
          timestamp: expect.any(Date),
        });
      });

      test('should sanitize boolean inputs', async () => {
        const maliciousSettings = {
          emailNotifications: '<script>alert("xss")</script>',
          shareNotifications: true,
          securityAlerts: 'true',
        };

        // Mock sanitization to return proper boolean values
        mockSanitizeInput.mockImplementation((input) => {
          if (typeof input === 'string') {
            return input === 'true';
          }
          return Boolean(input);
        });

        const sanitizedSettings = {
          emailNotifications: false,
          shareNotifications: true,
          securityAlerts: true,
        };

        mockUserService.updateNotificationSettings.mockResolvedValueOnce(sanitizedSettings);

        const request = createMockRequest('PUT', maliciousSettings);
        const response = await notificationsPUT(request);

        expect(response.status).toBe(200);
        expect(mockSanitizeInput).toHaveBeenCalledTimes(3);
      });
    });

    describe('❌ Error Cases', () => {
      test('should validate CSRF token', async () => {
        mockValidateCSRF.mockResolvedValueOnce(false);

        const request = createMockRequest('PUT', { emailNotifications: false });
        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid CSRF token');
      });

      test('should validate required fields', async () => {
        const invalidSettings = {
          invalidField: true,
        };

        const request = createMockRequest('PUT', invalidSettings);
        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('validation');
      });

      test('should validate boolean types', async () => {
        const invalidSettings = {
          emailNotifications: 'not-a-boolean',
          shareNotifications: 123,
          securityAlerts: null,
        };

        const request = createMockRequest('PUT', invalidSettings);
        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('must be boolean');
      });

      test('should handle database update failure', async () => {
        mockUserService.updateNotificationSettings.mockRejectedValueOnce(
          new Error('Database update failed')
        );

        const request = createMockRequest('PUT', { emailNotifications: false });
        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to update notification settings');
      });

      test('should enforce rate limiting for updates', async () => {
        mockCheckRateLimit.mockResolvedValueOnce({
          success: false,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Date.now() + 3600000,
          },
        });

        const request = createMockRequest('PUT', { emailNotifications: false });
        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toContain('Too many notification update attempts');
        expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      });

      test('should handle malformed JSON', async () => {
        const request = new NextRequest('https://localhost:3000/api/auth/notifications', {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            'cookie': 'auth-token=valid-token',
            'x-csrf-token': 'csrf-token-123',
          },
          body: 'invalid-json{',
        });

        const response = await notificationsPUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid JSON');
      });
    });
  });

  describe('OPTIONS /api/auth/notifications', () => {
    test('should handle CORS preflight request', async () => {
      const mockResponse = new Response(null, { status: 200 });
      mockHandleCORS.mockReturnValueOnce(mockResponse);

      const request = createMockRequest('OPTIONS');
      const response = await notificationsOPTIONS(request);

      expect(response.status).toBe(200);
      expect(mockHandleCORS).toHaveBeenCalledWith(request);
      expect(mockAddSecurityHeaders).toHaveBeenCalled();
    });

    test('should reject invalid CORS preflight', async () => {
      mockHandleCORS.mockReturnValueOnce(null);

      const request = createMockRequest('OPTIONS');
      const response = await notificationsOPTIONS(request);

      expect(response.status).toBe(405);
    });
  });

  describe('🔒 Security Features', () => {
    test('should apply security headers to all responses', async () => {
      const request = createMockRequest('GET');
      await notificationsGET(request);

      expect(mockAddSecurityHeaders).toHaveBeenCalled();
    });

    test('should validate origin for cross-origin requests', async () => {
      mockValidateOrigin.mockReturnValueOnce(false);

      const request = createMockRequest('GET', undefined, {
        'origin': 'https://malicious-site.com',
      });

      const response = await notificationsGET(request);
      expect(response.status).toBe(403);
    });

    test('should require authentication for all operations', async () => {
      mockAuthService.verifyToken.mockResolvedValueOnce(null);

      const getRequest = createMockRequest('GET');
      const getResponse = await notificationsGET(getRequest);
      expect(getResponse.status).toBe(401);

      const putRequest = createMockRequest('PUT', { emailNotifications: false });
      const putResponse = await notificationsPUT(putRequest);
      expect(putResponse.status).toBe(401);
    });

    test('should validate CSRF token for state-changing operations', async () => {
      const request = createMockRequest('PUT', { emailNotifications: false });
      await notificationsPUT(request);

      expect(mockValidateCSRF).toHaveBeenCalledWith(request, 'user-123');
    });
  });

  describe('🎯 Edge Cases', () => {
    test('should handle empty request body', async () => {
      const request = createMockRequest('PUT');
      const response = await notificationsPUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Request body is required');
    });

    test('should handle very large request body', async () => {
      const largeSettings = {
        emailNotifications: true,
        shareNotifications: true,
        securityAlerts: true,
        extraField: 'x'.repeat(10000), // Very large field
      };

      const request = createMockRequest('PUT', largeSettings);
      const response = await notificationsPUT(request);

      // Should either handle gracefully or reject
      expect([200, 400, 413]).toContain(response.status);
    });

    test('should handle concurrent notification updates', async () => {
      const settings1 = { emailNotifications: false };
      const settings2 = { shareNotifications: false };

      mockUserService.updateNotificationSettings
        .mockResolvedValueOnce({ ...defaultNotificationSettings, ...settings1 })
        .mockResolvedValueOnce({ ...defaultNotificationSettings, ...settings2 });

      const request1 = createMockRequest('PUT', settings1);
      const request2 = createMockRequest('PUT', settings2);

      const [response1, response2] = await Promise.all([
        notificationsPUT(request1),
        notificationsPUT(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    test('should handle missing authentication cookie', async () => {
      const request = createMockRequest('GET', undefined, {
        cookie: '', // No auth token
      });

      mockAuthService.verifyToken.mockResolvedValueOnce(null);
      const response = await notificationsGET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('🔄 Integration Scenarios', () => {
    test('should handle complete notification settings workflow', async () => {
      // 1. Get current settings
      const getRequest = createMockRequest('GET');
      const getResponse = await notificationsGET(getRequest);
      expect(getResponse.status).toBe(200);

      // 2. Update settings
      const newSettings = {
        emailNotifications: false,
        shareNotifications: true,
        securityAlerts: false,
      };

      mockUserService.updateNotificationSettings.mockResolvedValueOnce(newSettings);

      const putRequest = createMockRequest('PUT', newSettings);
      const putResponse = await notificationsPUT(putRequest);
      expect(putResponse.status).toBe(200);

      // 3. Verify cache invalidation and job queuing
      expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith('user-123');
      expect(mockJobQueue.add).toHaveBeenCalledWith('notification-preferences-updated', {
        userId: 'user-123',
        settings: newSettings,
        timestamp: expect.any(Date),
      });
    });

    test('should handle rate limiting across multiple requests', async () => {
      const requests = Array.from({ length: 12 }, (_, i) => 
        createMockRequest('PUT', { emailNotifications: i % 2 === 0 })
      );

      // First 10 should succeed, last 2 should be rate limited
      mockCheckRateLimit
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValueOnce({ success: true, headers: {} })
        .mockResolvedValue({ 
          success: false, 
          headers: { 'X-RateLimit-Limit': '10' } 
        });

      const responses = await Promise.all(
        requests.map(req => notificationsPUT(req))
      );

      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBe(10);
      expect(rateLimitedCount).toBe(2);
    });

    test('should handle notification settings with analytics tracking', async () => {
      const newSettings = {
        emailNotifications: false,
        shareNotifications: false,
        securityAlerts: true,
      };

      mockUserService.updateNotificationSettings.mockResolvedValueOnce(newSettings);

      const request = createMockRequest('PUT', newSettings);
      await notificationsPUT(request);

      // Verify analytics job was queued
      expect(mockJobQueue.add).toHaveBeenCalledWith('notification-preferences-updated', {
        userId: 'user-123',
        settings: newSettings,
        timestamp: expect.any(Date),
      });
    });
  });
});
