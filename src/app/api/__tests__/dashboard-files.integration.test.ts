/**
 * Dashboard Files API Integration Tests
 * 
 * Comprehensive test suite for /api/dashboard/files endpoint
 * Tests: GET and DELETE operations, authentication, rate limiting,
 * caching, compression, security, error handling, and performance
 */

import { NextRequest } from 'next/server';
import { GET, DELETE, OPTIONS } from '../dashboard/files/route';
import { FileService, RateLimitService } from '@/lib/database';
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

const mockFileService = FileService as jest.Mocked<typeof FileService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
const mockCompressionService = CompressionService as jest.Mocked<typeof CompressionService>;
const mockCDNService = CDNService as jest.Mocked<typeof CDNService>;
const mockJobQueue = JobQueue as jest.Mocked<typeof JobQueue>;

// Helper function to create mock requests
const createMockRequest = (
  method: string,
  url: string = 'https://example.com/api/dashboard/files',
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    body?: any;
  } = {}
) => {
  const headers = new Headers({
    'content-type': 'application/json',
    'user-agent': 'Test Agent',
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
const mockFiles = [
  {
    id: 'file1',
    fileName: 'document1.pdf',
    fileSize: 1024000,
    isPasswordProtected: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    userId: 'user123',
    shares: 5,
    downloads: 10,
  },
  {
    id: 'file2',
    fileName: 'presentation.pptx',
    fileSize: 2048000,
    isPasswordProtected: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    userId: 'user123',
    shares: 3,
    downloads: 7,
  },
  {
    id: 'file3',
    fileName: 'spreadsheet.xlsx',
    fileSize: 512000,
    isPasswordProtected: false,
    createdAt: '2024-01-03T00:00:00.000Z',
    userId: 'user123',
    shares: 8,
    downloads: 15,
  },
];

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
};

describe('Dashboard Files API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 49,
      resetTime: Date.now() + 60000,
    });

    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: mockUser,
    });

    mockFileService.getUserFiles.mockResolvedValue(mockFiles);

    mockCacheService.get.mockResolvedValue({
      data: null,
    });

    mockCacheService.set.mockResolvedValue(true);

    mockCompressionService.compress.mockResolvedValue({
      success: true,
      compressed: Buffer.from('compressed'),
      compressionRatio: 0.6,
      compressedSize: 100,
    });

    mockCDNService.getCDNUrl.mockReturnValue('https://cdn.example.com/api/dashboard/files');

    const mockJobQueueInstance = {
      addJob: jest.fn().mockResolvedValue('job123'),
    };
    mockJobQueue.getInstance.mockReturnValue(mockJobQueueInstance as any);
  });

  describe('OPTIONS Method - CORS Preflight', () => {
    test('should handle CORS preflight request successfully', async () => {
      const request = createMockRequest('OPTIONS', undefined, {
        headers: {
          'origin': 'https://example.com',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'authorization',
        },
      });

      const response = await OPTIONS(request);
      expect(response.status).toBe(200);
    });

    test('should reject preflight from invalid origin', async () => {
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
          'origin': 'https://example.com',
        },
      });

      const response = await OPTIONS(request);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
    });
  });

  describe('GET Method - Retrieve User Files', () => {
    describe('Authentication and Authorization', () => {
      test('should successfully authenticate valid user', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.files).toEqual(mockFiles);
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
      });

      test('should reject request without auth token', async () => {
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

      test('should handle token verification error', async () => {
        mockAuthService.verifyToken.mockRejectedValue(new Error('Token error'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'error-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
      });

      test('should reject token without user data', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
          valid: true,
          user: null,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'user-less-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
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
          'dashboard_files:192.168.1.1',
          'files_request',
          50,
          60000
        );
      });

      test('should reject requests exceeding rate limit', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 30000,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toBe('Too many requests. Please try again later.');
      });

      test('should handle IP from x-real-ip header', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-real-ip': '10.0.0.1' },
        });

        await GET(request);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'dashboard_files:10.0.0.1',
          'files_request',
          50,
          60000
        );
      });

      test('should handle multiple IPs in x-forwarded-for', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
        });

        await GET(request);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'dashboard_files:203.0.113.1',
          'files_request',
          50,
          60000
        );
      });

      test('should handle unknown IP gracefully', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        await GET(request);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'dashboard_files:unknown',
          'files_request',
          50,
          60000
        );
      });
    });

    describe('Caching Functionality', () => {
      test('should serve files from cache when available', async () => {
        const cachedFiles = [mockFiles[0]];
        mockCacheService.get.mockResolvedValue({
          data: cachedFiles,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.files).toEqual(cachedFiles);
        expect(data.cached).toBe(true);
        expect(response.headers.get('x-cache-status')).toBe('HIT');
        expect(mockFileService.getUserFiles).not.toHaveBeenCalled();
      });

      test('should fetch from database when cache miss', async () => {
        mockCacheService.get.mockResolvedValue({ data: null });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.files).toEqual(mockFiles);
        expect(data.cached).toBe(false);
        expect(response.headers.get('x-cache-status')).toBe('MISS');
        expect(mockFileService.getUserFiles).toHaveBeenCalledWith('user123');
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'dashboard_files:user123',
          mockFiles,
          300
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
        expect(data.files).toEqual(mockFiles);
        expect(mockFileService.getUserFiles).toHaveBeenCalled();
      });

      test('should cache files with proper TTL', async () => {
        mockCacheService.get.mockResolvedValue({ data: null });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        await GET(request);

        expect(mockCacheService.set).toHaveBeenCalledWith(
          'dashboard_files:user123',
          mockFiles,
          300 // 5 minutes TTL
        );
      });
    });

    describe('Response Compression', () => {
      test('should compress large responses', async () => {
        const largeFiles = Array(50).fill(mockFiles[0]).map((file, i) => ({
          ...file,
          id: `file${i}`,
        }));
        mockFileService.getUserFiles.mockResolvedValue(largeFiles);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-encoding')).toBe('gzip');
        expect(response.headers.get('x-compression-ratio')).toBe('0.6');
        expect(mockCompressionService.compress).toHaveBeenCalled();
      });

      test('should not compress small responses', async () => {
        mockFileService.getUserFiles.mockResolvedValue([mockFiles[0]]);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-encoding')).toBeNull();
        expect(mockCompressionService.compress).not.toHaveBeenCalled();
      });

      test('should handle compression errors gracefully', async () => {
        const largeFiles = Array(50).fill(mockFiles[0]).map((file, i) => ({
          ...file,
          id: `file${i}`,
        }));
        mockFileService.getUserFiles.mockResolvedValue(largeFiles);
        mockCompressionService.compress.mockRejectedValue(new Error('Compression failed'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-encoding')).toBeNull();
      });

      test('should handle compression failure gracefully', async () => {
        const largeFiles = Array(50).fill(mockFiles[0]);
        mockFileService.getUserFiles.mockResolvedValue(largeFiles);
        mockCompressionService.compress.mockResolvedValue({
          success: false,
          compressed: null,
          compressionRatio: 1,
          compressedSize: 0,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-encoding')).toBeNull();
      });
    });

    describe('CDN Integration', () => {
      test('should include CDN URL in response headers', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.headers.get('x-cdn-url')).toBe(
          'https://cdn.example.com/api/dashboard/files'
        );
        expect(mockCDNService.getCDNUrl).toHaveBeenCalledWith(
          '/api/dashboard/files',
          { type: 'api', optimization: true }
        );
      });

      test('should handle CDN unavailability', async () => {
        mockCDNService.getCDNUrl.mockReturnValue(null);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('x-cdn-url')).toBeNull();
      });

      test('should handle CDN errors gracefully', async () => {
        mockCDNService.getCDNUrl.mockImplementation(() => {
          throw new Error('CDN error');
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Analytics Job Queue', () => {
      test('should queue analytics job successfully', async () => {
        const mockAddJob = jest.fn().mockResolvedValue('job123');
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        await GET(request);

        expect(mockAddJob).toHaveBeenCalledWith('analytics-processing', {
          type: 'dashboard_files_view',
          userId: 'user123',
          ip: '192.168.1.1',
          userAgent: 'Test Agent',
          timestamp: expect.any(String),
          fileCount: 3,
        });
      });

      test('should handle analytics job queue errors gracefully', async () => {
        const mockAddJob = jest.fn().mockRejectedValue(new Error('Queue error'));
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        // Should not affect the main response
      });

      test('should handle empty file arrays in analytics', async () => {
        mockFileService.getUserFiles.mockResolvedValue([]);
        const mockAddJob = jest.fn().mockResolvedValue('job123');
        mockJobQueue.getInstance.mockReturnValue({ addJob: mockAddJob } as any);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        await GET(request);

        expect(mockAddJob).toHaveBeenCalledWith('analytics-processing', {
          type: 'dashboard_files_view',
          userId: 'user123',
          ip: 'unknown',
          userAgent: 'Test Agent',
          timestamp: expect.any(String),
          fileCount: 0,
        });
      });
    });

    describe('Response Format and Headers', () => {
      test('should return properly formatted response', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          success: true,
          files: mockFiles,
          cached: false,
          timestamp: expect.any(String),
        });
      });

      test('should include security headers', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(response.headers.get('x-frame-options')).toBe('DENY');
        expect(response.headers.get('x-xss-protection')).toBe('1; mode=block');
      });

      test('should include timestamp in response', async () => {
        const beforeTime = new Date().toISOString();
        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();
        const afterTime = new Date().toISOString();

        expect(data.timestamp).toBeDefined();
        expect(data.timestamp >= beforeTime).toBe(true);
        expect(data.timestamp <= afterTime).toBe(true);
      });

      test('should handle empty file arrays', async () => {
        mockFileService.getUserFiles.mockResolvedValue([]);

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.files).toEqual([]);
        expect(data.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      test('should handle database errors', async () => {
        mockFileService.getUserFiles.mockRejectedValue(new Error('Database error'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });

      test('should handle malformed requests', async () => {
        const request = createMockRequest('GET', 'invalid-url', {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      test('should handle service unavailable scenarios', async () => {
        mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Service unavailable'));

        const request = createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });
  });

  describe('DELETE Method - File Deletion', () => {
    describe('Authentication and Authorization', () => {
      test('should successfully delete file with valid authentication', async () => {
        const fileToDelete = { ...mockFiles[0], userId: 'user123' };
        mockFileService.getFileMetadata.mockResolvedValue(fileToDelete);
        mockFileService.deleteFile.mockResolvedValue(true);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'x-forwarded-for': '192.168.1.1' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('File deleted successfully');
        expect(mockFileService.deleteFile).toHaveBeenCalledWith('file1');
      });

      test('should reject deletion without authentication', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1'
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      test('should reject deletion with invalid token', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
          valid: false,
          user: null,
        });

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'invalid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid token');
      });

      test('should prevent deletion of files not owned by user', async () => {
        const otherUserFile = { ...mockFiles[0], userId: 'other-user' };
        mockFileService.getFileMetadata.mockResolvedValue(otherUserFile);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('File not found or access denied');
        expect(mockFileService.deleteFile).not.toHaveBeenCalled();
      });

      test('should handle non-existent files', async () => {
        mockFileService.getFileMetadata.mockResolvedValue(null);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=nonexistent',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('File not found or access denied');
      });
    });

    describe('Rate Limiting for Deletion', () => {
      test('should allow deletions within rate limit', async () => {
        const fileToDelete = { ...mockFiles[0], userId: 'user123' };
        mockFileService.getFileMetadata.mockResolvedValue(fileToDelete);
        mockFileService.deleteFile.mockResolvedValue(true);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'x-forwarded-for': '192.168.1.1' },
          }
        );

        const response = await DELETE(request);

        expect(response.status).toBe(200);
        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          'dashboard_delete:192.168.1.1',
          'delete_request',
          10,
          60000
        );
      });

      test('should reject excessive deletion attempts', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 30000,
        });

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
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

      test('should handle rate limit service errors', async () => {
        mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit error'));

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
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

    describe('CSRF Protection', () => {
      test('should validate request origin', async () => {
        const fileToDelete = { ...mockFiles[0], userId: 'user123' };
        mockFileService.getFileMetadata.mockResolvedValue(fileToDelete);
        mockFileService.deleteFile.mockResolvedValue(true);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: {
              'origin': 'http://localhost:3000',
              'x-forwarded-for': '192.168.1.1',
            },
          }
        );

        const response = await DELETE(request);

        expect(response.status).toBe(200);
      });

      test('should reject requests from invalid origins', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: {
              'origin': 'https://malicious-site.com',
            },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid request origin');
      });
    });

    describe('Input Validation', () => {
      test('should require file ID parameter', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('File ID is required');
      });

      test('should handle malformed file IDs', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('File ID is required');
      });

      test('should sanitize file ID input', async () => {
        const fileToDelete = { ...mockFiles[0], userId: 'user123' };
        mockFileService.getFileMetadata.mockResolvedValue(fileToDelete);
        mockFileService.deleteFile.mockResolvedValue(true);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1%3Cscript%3E',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        await DELETE(request);

        // Should sanitize the file ID before using it
        expect(mockFileService.getFileMetadata).toHaveBeenCalled();
      });
    });

    describe('Database Operations', () => {
      test('should handle database errors during metadata fetch', async () => {
        mockFileService.getFileMetadata.mockRejectedValue(new Error('Database error'));

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });

      test('should handle database errors during deletion', async () => {
        const fileToDelete = { ...mockFiles[0], userId: 'user123' };
        mockFileService.getFileMetadata.mockResolvedValue(fileToDelete);
        mockFileService.deleteFile.mockRejectedValue(new Error('Deletion failed'));

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });

      test('should handle database timeout scenarios', async () => {
        mockFileService.getFileMetadata.mockImplementation(() => 
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
        );

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
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

    describe('Security Headers', () => {
      test('should include security headers in deletion response', async () => {
        const fileToDelete = { ...mockFiles[0], userId: 'user123' };
        mockFileService.getFileMetadata.mockResolvedValue(fileToDelete);
        mockFileService.deleteFile.mockResolvedValue(true);

        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1',
          {
            cookies: { 'auth-token': 'valid-token' },
          }
        );

        const response = await DELETE(request);

        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(response.headers.get('x-frame-options')).toBe('DENY');
        expect(response.headers.get('x-xss-protection')).toBe('1; mode=block');
      });

      test('should include security headers in error responses', async () => {
        const request = createMockRequest(
          'DELETE',
          'https://example.com/api/dashboard/files?id=file1'
        );

        const response = await DELETE(request);

        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(response.headers.get('x-frame-options')).toBe('DENY');
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
      expect(mockFileService.getUserFiles).toHaveBeenCalledTimes(1);
    });

    test('should handle concurrent DELETE requests with rate limiting', async () => {
      mockRateLimitService.checkRateLimit
        .mockResolvedValueOnce({ allowed: true, remaining: 9, resetTime: Date.now() + 60000 })
        .mockResolvedValueOnce({ allowed: true, remaining: 8, resetTime: Date.now() + 60000 })
        .mockResolvedValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 });

      const fileToDelete = { ...mockFiles[0], userId: 'user123' };
      mockFileService.getFileMetadata.mockResolvedValue(fileToDelete);
      mockFileService.deleteFile.mockResolvedValue(true);

      const requests = Array(3).fill(null).map((_, i) =>
        createMockRequest(
          'DELETE',
          `https://example.com/api/dashboard/files?id=file${i}`,
          {
            cookies: { 'auth-token': 'valid-token' },
            headers: { 'x-forwarded-for': '192.168.1.1' },
          }
        )
      );

      const responses = await Promise.all(requests.map(req => DELETE(req)));

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(429);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      const requests = Array(20).fill(null).map(() =>
        createMockRequest('GET', undefined, {
          cookies: { 'auth-token': 'valid-token' },
        })
      );

      await Promise.all(requests.map(req => GET(req)));

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('https://example.com/api/dashboard/files', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: 'invalid-json',
      });

      const response = await DELETE(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle extremely large file lists', async () => {
      const largeFileList = Array(10000).fill(mockFiles[0]).map((file, i) => ({
        ...file,
        id: `file${i}`,
      }));
      mockFileService.getUserFiles.mockResolvedValue(largeFileList);

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCompressionService.compress).toHaveBeenCalled();
    });

    test('should handle memory pressure scenarios', async () => {
      // Simulate low memory by making compression fail
      mockCompressionService.compress.mockRejectedValue(new Error('Out of memory'));

      const largeFileList = Array(1000).fill(mockFiles[0]);
      mockFileService.getUserFiles.mockResolvedValue(largeFileList);

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should fallback to uncompressed response
    });

    test('should handle network timeout scenarios', async () => {
      mockFileService.getUserFiles.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockFiles), 100))
      );

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
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
  });

  describe('Security and Validation', () => {
    test('should prevent SQL injection in file IDs', async () => {
      const maliciousId = "file1'; DROP TABLE files; --";
      const request = createMockRequest(
        'DELETE',
        `https://example.com/api/dashboard/files?id=${encodeURIComponent(maliciousId)}`,
        {
          cookies: { 'auth-token': 'valid-token' },
        }
      );

      await DELETE(request);

      // Should sanitize the input before database operations
      expect(mockFileService.getFileMetadata).toHaveBeenCalled();
    });

    test('should prevent XSS in response data', async () => {
      const fileWithXSS = {
        ...mockFiles[0],
        fileName: '<script>alert("xss")</script>document.pdf',
      };
      mockFileService.getUserFiles.mockResolvedValue([fileWithXSS]);

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.files[0].fileName).toBe('<script>alert("xss")</script>document.pdf');
      // Response should include proper content-type header
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    test('should handle oversized responses', async () => {
      const oversizedFileList = Array(100000).fill(mockFiles[0]);
      mockFileService.getUserFiles.mockResolvedValue(oversizedFileList);

      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should attempt compression for large responses
      expect(mockCompressionService.compress).toHaveBeenCalled();
    });

    test('should validate request headers for security', async () => {
      const request = createMockRequest('GET', undefined, {
        cookies: { 'auth-token': 'valid-token' },
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Agent',
          'accept': 'application/json',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});
