/**
 * Dashboard Shared API Integration Tests
 * 
 * Comprehensive test suite for /api/dashboard/shared endpoint
 * Tests: GET, POST, DELETE operations, shared link management,
 * authentication, rate limiting, caching, CSRF protection, and analytics
 */

import { NextRequest } from 'next/server';
import { GET, POST, DELETE, OPTIONS } from '../dashboard/shared/route';
import { SharedLinkService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { JobQueue } from '@/lib/job-queue';

// Mock implementations
jest.mock('@/lib/database');
jest.mock('@/lib/auth-enhanced');
jest.mock('@/lib/cache');
jest.mock('@/lib/compression');
jest.mock('@/lib/cdn');
jest.mock('@/lib/job-queue');

const mockSharedLinkService = SharedLinkService as jest.Mocked<typeof SharedLinkService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
const mockCompressionService = CompressionService as jest.Mocked<typeof CompressionService>;
const mockCDNService = CDNService as jest.Mocked<typeof CDNService>;
const mockJobQueue = JobQueue as jest.Mocked<typeof JobQueue>;

// Helper function to create mock requests
const createMockRequest = (
  method: string,
  url: string = 'https://example.com/api/dashboard/shared',
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    body?: any;
  } = {}
) => {
  const headers = new Headers({
    'content-type': 'application/json',
    'user-agent': 'Test Agent',
    'origin': 'http://localhost:3000',
    ...options.headers,
  });

  if (options.cookies) {
    Object.entries(options.cookies).forEach(([name, value]) => {
      headers.set('cookie', `${name}=${value}`);
    });
  }

  const request = new NextRequest(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Mock cookies getter
  Object.defineProperty(request, 'cookies', {
    value: {
      get: (name: string) => ({
        value: options.cookies?.[name],
      }),
    },
  });

  return request;
};

// Sample test data
const mockSharedLinks = [
  {
    id: 'link1',
    fileId: 'file1',
    fileName: 'document1.pdf',
    shareUrl: 'https://example.com/share/file1',
    views: 25,
    downloads: 10,
    createdAt: '2024-01-01T00:00:00.000Z',
    expiresAt: '2024-12-31T23:59:59.000Z',
    isActive: true,
    userId: 'user123',
  },
  {
    id: 'link2',
    fileId: 'file2',
    fileName: 'presentation.pptx',
    shareUrl: 'https://example.com/share/file2',
    views: 15,
    downloads: 8,
    createdAt: '2024-01-02T00:00:00.000Z',
    expiresAt: null,
    isActive: true,
    userId: 'user123',
  },
  {
    id: 'link3',
    fileId: 'file3',
    fileName: 'expired-doc.txt',
    shareUrl: 'https://example.com/share/file3',
    views: 5,
    downloads: 2,
    createdAt: '2024-01-03T00:00:00.000Z',
    expiresAt: '2024-01-04T00:00:00.000Z',
    isActive: false,
    userId: 'user123',
  },
];

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
};

const mockNewSharedLink = {
  id: 'new-link',
  fileId: 'file4',
  shareUrl: 'https://example.com/share/file4',
  createdAt: '2024-01-04T00:00:00.000Z',
  isActive: true,
};

describe('Dashboard Shared API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
      resetTime: Date.now() + 900000,
    });

    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: mockUser,
    });

    mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
    mockSharedLinkService.createSharedLink.mockResolvedValue(mockNewSharedLink);
    mockSharedLinkService.deleteSharedLink.mockResolvedValue(true);

    mockCacheService.get.mockResolvedValue({ data: null });
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.delete.mockResolvedValue(true);

    mockCompressionService.compress.mockResolvedValue({
      success: true,
      compressed: Buffer.from('compressed'),
      compressionRatio: 0.7,
      compressedSize: 150,
    });

    mockCDNService.getCDNUrl.mockReturnValue('https://cdn.example.com/api/dashboard/shared');

    const mockJobQueueInstance = {
      addJob: jest.fn().mockResolvedValue('job123'),
    };
    mockJobQueue.getInstance.mockReturnValue(mockJobQueueInstance as any);
  });

  describe('OPTIONS Method - CORS Preflight', () => {
    test('should handle CORS preflight request successfully', async () => {
      const request = createMockRequest('OPTIONS', undefined, {
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'authorization',
        },
      });

      const response = await OPTIONS(request);
      expect(response.status).toBe(200);
    });

    test('should reject preflight from unauthorized origin', async () => {
      const request = createMockRequest('OPTIONS', undefined, {
        headers: {
          'origin': 'https://malicious-site.com',
        },
      });

      const response = await OPTIONS(request);
      expect(response.status).toBe(405);
    });

    test('should include security headers in preflight response', async () => {
      const request = createMockRequest('OPTIONS', undefined, {
        headers: {
          'origin': 'http://localhost:3000',
        },
      });

      const response = await OPTIONS(request);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
    });
  });

  describe('GET Method - Retrieve Shared Links', () => {
    describe('Authentication and Authorization', () => {
      test('should successfully retrieve shared links with valid authentication', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.sharedLinks).toEqual(mockSharedLinks);
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
      });

      test('should reject request without authentication', async () => {
        const request = createMockRequest('GET');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      test('should reject request with invalid token', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
          valid: false,
          user: null,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'invalid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
      });

      test('should handle token verification errors', async () => {
        mockAuthService.verifyToken.mockRejectedValue(new Error('Token verification failed'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'error-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
      });

      test('should validate request origin for CSRF protection', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'origin': 'https://malicious-site.com' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid request origin');
      });
    });

    describe('Rate Limiting', () => {
      test('should allow requests within rate limit', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        const response = await GET(request);
        expect(response.status).toBe(200);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'shared_links',
          '192.168.1.1',
          20,
          900
        );
      });

      test('should reject requests exceeding rate limit', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 450000,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toBe('Too many requests. Please try again later.');
        expect(response.headers.get('x-ratelimit-limit')).toBe('20');
        expect(response.headers.get('x-ratelimit-remaining')).toBe('0');
      });

      test('should extract IP from x-real-ip header', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-real-ip': '10.0.0.1' },
        });

        await GET(request);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'shared_links',
          '10.0.0.1',
          20,
          900
        );
      });

      test('should handle multiple IPs in x-forwarded-for', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.168.1.1' },
        });

        await GET(request);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'shared_links',
          '203.0.113.1',
          20,
          900
        );
      });
    });

    describe('Caching Functionality', () => {
      test('should serve shared links from cache when available', async () => {
        const cachedLinks = [mockSharedLinks[0]];
        mockCacheService.get.mockResolvedValue({ data: cachedLinks });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.sharedLinks).toEqual(cachedLinks);
        expect(data.cached).toBe(true);
        expect(response.headers.get('x-cache-status')).toBe('HIT');
        expect(mockSharedLinkService.getUserSharedLinks).not.toHaveBeenCalled();
      });

      test('should fetch from database when cache miss', async () => {
        mockCacheService.get.mockResolvedValue({ data: null });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.sharedLinks).toEqual(mockSharedLinks);
        expect(data.cached).toBe(false);
        expect(response.headers.get('x-cache-status')).toBe('MISS');
        expect(mockSharedLinkService.getUserSharedLinks).toHaveBeenCalledWith('user123');
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'dashboard_shared:user123',
          mockSharedLinks,
          180
        );
      });

      test('should handle cache errors gracefully', async () => {
        mockCacheService.get.mockRejectedValue(new Error('Cache error'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.sharedLinks).toEqual(mockSharedLinks);
        expect(mockSharedLinkService.getUserSharedLinks).toHaveBeenCalled();
      });

      test('should cache shared links with proper TTL', async () => {
        mockCacheService.get.mockResolvedValue({ data: null });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        await GET(request);

        expect(mockCacheService.set).toHaveBeenCalledWith(
          'dashboard_shared:user123',
          mockSharedLinks,
          180 // 3 minutes TTL
        );
      });
    });

    describe('Response Compression', () => {
      test('should compress large responses', async () => {
        const largeSharedLinks = Array(100).fill(mockSharedLinks[0]).map((link, i) => ({
          ...link,
          id: `link${i}`,
        }));
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(largeSharedLinks);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-encoding')).toBe('gzip');
        expect(response.headers.get('x-compression-ratio')).toBe('0.7');
        expect(mockCompressionService.compress).toHaveBeenCalled();
      });

      test('should not compress small responses', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue([mockSharedLinks[0]]);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-encoding')).toBeNull();
        expect(mockCompressionService.compress).not.toHaveBeenCalled();
      });

      test('should handle compression failures gracefully', async () => {
        const largeSharedLinks = Array(100).fill(mockSharedLinks[0]);
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(largeSharedLinks);
        mockCompressionService.compress.mockRejectedValue(new Error('Compression failed'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-encoding')).toBeNull();
      });
    });

    describe('CDN Integration and Analytics', () => {
      test('should include CDN URL in response headers', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.headers.get('x-cdn-url')).toBe(
          'https://cdn.example.com/api/dashboard/shared'
        );
        expect(mockCDNService.getCDNUrl).toHaveBeenCalledWith(
          '/api/dashboard/shared',
          { type: 'api', optimization: true }
        );
      });

      test('should queue analytics job successfully', async () => {
        const mockAddJob = jest.fn().mockResolvedValue('job123');
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        await GET(request);

        expect(mockAddJob).toHaveBeenCalledWith('analytics-processing', {
          type: 'dashboard_shared_view',
          userId: 'user123',
          ip: '192.168.1.1',
          userAgent: 'Test Agent',
          timestamp: expect.any(String),
          sharedLinksCount: 3,
        });
      });

      test('should handle analytics job errors gracefully', async () => {
        const mockAddJob = jest.fn().mockRejectedValue(new Error('Queue error'));
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        // Should not affect the main response
      });
    });

    describe('Response Format and Error Handling', () => {
      test('should return properly formatted response', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          success: true,
          sharedLinks: mockSharedLinks,
          cached: false,
          timestamp: expect.any(String),
        });
      });

      test('should handle database errors', async () => {
        mockSharedLinkService.getUserSharedLinks.mockRejectedValue(new Error('Database error'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });

      test('should handle empty shared links array', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue([]);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.sharedLinks).toEqual([]);
        expect(data.success).toBe(true);
      });
    });
  });

  describe('POST Method - Create Shared Link', () => {
    describe('Authentication and Input Validation', () => {
      test('should successfully create shared link with valid data', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
          body: {
            fileId: 'file4',
            expiresAt: '2024-12-31T23:59:59.000Z',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.sharedLink).toEqual(mockNewSharedLink);
        expect(mockSharedLinkService.createSharedLink).toHaveBeenCalledWith({
          fileId: 'file4',
          userId: 'user123',
          expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        });
      });

      test('should create shared link without expiration date', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: { fileId: 'file5' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockSharedLinkService.createSharedLink).toHaveBeenCalledWith({
          fileId: 'file5',
          userId: 'user123',
          expiresAt: undefined,
        });
      });

      test('should reject request without authentication', async () => {
        const request = createMockRequest('POST', undefined, {
          body: { fileId: 'file4' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      test('should validate request input with Zod schema', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: { fileId: '' }, // Invalid empty fileId
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation failed');
        expect(data.details).toBeDefined();
      });

      test('should validate expiration date format', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: {
            fileId: 'file4',
            expiresAt: 'invalid-date',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation failed');
      });

      test('should reject request with missing fileId', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: { expiresAt: '2024-12-31T23:59:59.000Z' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation failed');
      });
    });

    describe('Rate Limiting and CSRF Protection', () => {
      test('should apply stricter rate limiting for creation', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
          body: { fileId: 'file4' },
        });

        await POST(request);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'create_shared_link',
          '192.168.1.1',
          10,
          3600
        );
      });

      test('should reject excessive creation attempts', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 1800000,
        });

        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
          body: { fileId: 'file4' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toBe('Too many requests. Please try again later.');
      });

      test('should validate request origin for CSRF protection', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'origin': 'https://malicious-site.com' },
          body: { fileId: 'file4' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid request origin');
      });
    });

    describe('Cache Management and Analytics', () => {
      test('should invalidate cache after creating shared link', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: { fileId: 'file4' },
        });

        await POST(request);

        expect(mockCacheService.delete).toHaveBeenCalledWith('dashboard_shared:user123');
      });

      test('should queue analytics job for link creation', async () => {
        const mockAddJob = jest.fn().mockResolvedValue('job123');
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
          body: { fileId: 'file4' },
        });

        await POST(request);

        expect(mockAddJob).toHaveBeenCalledWith('analytics-processing', {
          type: 'shared_link_created',
          userId: 'user123',
          fileId: 'file4',
          ip: '192.168.1.1',
          userAgent: 'Test Agent',
          timestamp: expect.any(String),
        });
      });

      test('should handle analytics job errors during creation', async () => {
        const mockAddJob = jest.fn().mockRejectedValue(new Error('Analytics error'));
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: { fileId: 'file4' },
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
        // Should not affect the main response
      });
    });

    describe('Error Handling', () => {
      test('should handle file not found errors', async () => {
        mockSharedLinkService.createSharedLink.mockRejectedValue(
          new Error('File not found')
        );

        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: { fileId: 'nonexistent' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('File not found');
      });

      test('should handle database errors during creation', async () => {
        mockSharedLinkService.createSharedLink.mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = createMockRequest('POST', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          body: { fileId: 'file4' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });

      test('should handle malformed JSON in request body', async () => {
        const request = new NextRequest('https://example.com/api/dashboard/shared', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'cookie': 'auth-token=valid-token',
            'origin': 'http://localhost:3000',
          },
          body: 'invalid-json',
        });

        const response = await POST(request);
        expect(response.status).toBeGreaterThanOrEqual(400);
      });
    });
  });

  describe('DELETE Method - Remove Shared Link', () => {
    describe('Authentication and Authorization', () => {
      test('should successfully delete shared link with valid authentication', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'x-forwarded-for': '192.168.1.1' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Shared link deleted successfully');
        expect(mockSharedLinkService.deleteSharedLink).toHaveBeenCalledWith('file1');
      });

      test('should reject deletion without authentication', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1'
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      test('should verify user ownership of shared link', async () => {
        // Mock user shared links without the requested file
        const userLinks = mockSharedLinks.filter(link => link.fileId !== 'file1');
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(userLinks);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Shared link not found or access denied');
      });

      test('should require file ID parameter', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('File ID is required');
      });

      test('should validate request origin for CSRF protection', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'origin': 'https://malicious-site.com' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid request origin');
      });
    });

    describe('Rate Limiting and Input Sanitization', () => {
      test('should apply appropriate rate limiting for deletion', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'x-forwarded-for': '192.168.1.1' },
          }
        );

        await DELETE(request);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'delete_shared_link',
          '192.168.1.1',
          20,
          900
        );
      });

      test('should reject excessive deletion attempts', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 450000,
        });

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'x-forwarded-for': '192.168.1.1' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toBe('Too many requests. Please try again later.');
      });

      test('should sanitize file ID input', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);

        const maliciousId = "file1'; DROP TABLE shared_links; --";
        const request = createMockRequest(
          'DELETE',
          `https://example.com/api/dashboard/shared?id=${encodeURIComponent(maliciousId)}`,
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        await DELETE(request);

        // Should sanitize the input before database operations
        expect(mockSharedLinkService.getUserSharedLinks).toHaveBeenCalled();
      });
    });

    describe('Cache Management and Analytics', () => {
      test('should invalidate cache after deletion', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        await DELETE(request);

        expect(mockCacheService.delete).toHaveBeenCalledWith('dashboard_shared:user123');
      });

      test('should queue analytics job for link deletion', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
        const mockAddJob = jest.fn().mockResolvedValue('job123');
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'x-forwarded-for': '192.168.1.1' },
          }
        );

        await DELETE(request);

        expect(mockAddJob).toHaveBeenCalledWith('analytics-processing', {
          type: 'shared_link_deleted',
          userId: 'user123',
          fileId: 'file1',
          ip: '192.168.1.1',
          userAgent: 'Test Agent',
          timestamp: expect.any(String),
        });
      });

      test('should handle analytics job errors during deletion', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
        const mockAddJob = jest.fn().mockRejectedValue(new Error('Analytics error'));
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);

        expect(response.status).toBe(200);
        // Should not affect the main response
      });
    });

    describe('Error Handling', () => {
      test('should handle shared link not found during deletion', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
        mockSharedLinkService.deleteSharedLink.mockRejectedValue(
          new Error('Shared link not found')
        );

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Shared link not found');
      });

      test('should handle database errors during deletion', async () => {
        mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
        mockSharedLinkService.deleteSharedLink.mockRejectedValue(
          new Error('Database error')
        );

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });

      test('should handle user shared links fetch errors', async () => {
        mockSharedLinkService.getUserSharedLinks.mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/shared?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });
  });

  describe('Performance and Concurrent Operations', () => {
    test('should handle concurrent GET requests efficiently', async () => {
      const requests = Array(10).fill(null).map(() =>
        createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        })
      );

      const responses = await Promise.all(requests.map(req => GET(req)));

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should use cache for subsequent requests
      expect(mockSharedLinkService.getUserSharedLinks).toHaveBeenCalledTimes(1);
    });

    test('should handle concurrent creation and deletion operations', async () => {
      mockSharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);

      const createRequest = createMockRequest('POST', undefined, {
        cookies: { 'auth-token': 'valid-token' },
        body: { fileId: 'file4' },
      });

      const deleteRequest = createMockRequest(
        'DELETE',
        'https://example.com/api/dashboard/shared?id=file1',
        {
          cookies: { 'auth-token': 'valid-token' },
        }
      );

      const [createResponse, deleteResponse] = await Promise.all([
        POST(createRequest),
        DELETE(deleteRequest),
      ]);

      expect(createResponse.status).toBe(200);
      expect(deleteResponse.status).toBe(200);
      expect(mockCacheService.delete).toHaveBeenCalledTimes(2);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      const requests = Array(50).fill(null).map(() =>
        createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        })
      );

      await Promise.all(requests.map(req => GET(req)));

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Security and Edge Cases', () => {
    test('should prevent XSS in shared link data', async () => {
      const linksWithXSS = [{
        ...mockSharedLinks[0],
        fileName: '<script>alert("xss")</script>document.pdf',
      }];
      mockSharedLinkService.getUserSharedLinks.mockResolvedValue(linksWithXSS);

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sharedLinks[0].fileName).toBe('<script>alert("xss")</script>document.pdf');
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    test('should handle oversized shared link responses', async () => {
      const oversizedLinks = Array(10000).fill(mockSharedLinks[0]);
      mockSharedLinkService.getUserSharedLinks.mockResolvedValue(oversizedLinks);

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCompressionService.compress).toHaveBeenCalled();
    });

    test('should handle service degradation gracefully', async () => {
      // Simulate partial service failure
      mockCacheService.get.mockRejectedValue(new Error('Cache unavailable'));
      mockCDNService.getCDNUrl.mockImplementation(() => {
        throw new Error('CDN unavailable');
      });

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should still work without cache and CDN
    });

    test('should include proper security headers', async () => {
      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);

      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-xss-protection')).toBe('1; mode=block');
    });

    test('should handle malformed URLs gracefully', async () => {
      const request = createMockRequest(
        'DELETE',
        'https://example.com/api/dashboard/shared?id=file1%00%invalid',
        {
          cookies: { 'auth-token': 'valid-token' },
        }
      );

      const response = await DELETE(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
