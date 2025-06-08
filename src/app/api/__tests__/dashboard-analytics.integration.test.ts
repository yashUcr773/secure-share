import { NextRequest } from 'next/server';
import { GET } from '../dashboard/analytics/route';

// Mock dependencies
jest.mock('@/lib/database', () => ({
  FileService: {
    getUserFiles: jest.fn(),
  },
  SharedLinkService: {
    getUserSharedLinks: jest.fn(),
  },
  RateLimitService: {
    checkRateLimit: jest.fn(),
  },
}));

jest.mock('@/lib/auth-enhanced', () => ({
  AuthService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('@/lib/security', () => ({
  addSecurityHeaders: jest.fn((response) => response),
  validateOrigin: jest.fn(() => true),
  handleCORSPreflight: jest.fn(),
  sanitizeInput: jest.fn((input) => input),
}));

jest.mock('@/lib/cache', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/lib/compression', () => ({
  CompressionService: {
    compress: jest.fn(),
  },
}));

jest.mock('@/lib/cdn', () => ({
  CDNService: {
    getCDNUrl: jest.fn((url) => url),
  },
}));

jest.mock('@/lib/job-queue', () => ({
  jobQueue: {
    addJob: jest.fn(),
  },
}));

const { FileService, SharedLinkService, RateLimitService } = require('@/lib/database');
const { AuthService } = require('@/lib/auth-enhanced');
const { CacheService } = require('@/lib/cache');
const { CompressionService } = require('@/lib/compression');

describe('/api/dashboard/analytics Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    RateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 900000,
    });

    AuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: { id: 'user123', email: 'test@example.com' },
    });

    CacheService.get.mockResolvedValue(null);
    CacheService.set.mockResolvedValue(true);
  });

  describe('GET /api/dashboard/analytics', () => {
    it('should return analytics data for authenticated user', async () => {
      const mockSharedLinks = [
        {
          id: 'link1',
          fileId: 'file1',
          views: 10,
          downloads: 5,
          isActive: true,
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          file: { fileName: 'document1.pdf' },
        },
        {
          id: 'link2',
          fileId: 'file2',
          views: 20,
          downloads: 8,
          isActive: true,
          expiresAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2024-01-02T00:00:00.000Z',
          file: { fileName: 'document2.docx' },
        },
      ];

      const mockUserFiles = [
        {
          id: 'file1',
          fileName: 'document1.pdf',
          fileSize: 1024000,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'file2',
          fileName: 'document2.docx',
          fileSize: 2048000,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      SharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
      FileService.getUserFiles.mockResolvedValue(mockUserFiles);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics?timeRange=30d', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-browser',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analytics).toBeDefined();
      expect(data.analytics.totalViews).toBe(30); // 10 + 20
      expect(data.analytics.totalDownloads).toBe(13); // 5 + 8
      expect(data.analytics.totalShares).toBe(2); // Number of shared links
      expect(data.analytics.activeLinks).toBe(2); // Both links are active
      expect(data.analytics.popularFiles).toHaveLength(2);
      expect(data.analytics.recentActivity).toHaveLength(2);
      expect(data.analytics.viewsOverTime).toHaveLength(30); // 30 days of data
    });

    it('should handle different time ranges', async () => {
      SharedLinkService.getUserSharedLinks.mockResolvedValue([]);
      FileService.getUserFiles.mockResolvedValue([]);

      const testCases = [
        { timeRange: '7d', expectedDays: 7 },
        { timeRange: '30d', expectedDays: 30 },
        { timeRange: '90d', expectedDays: 90 },
      ];

      for (const { timeRange, expectedDays } of testCases) {
        const request = new NextRequest(`http://localhost:3000/api/dashboard/analytics?timeRange=${timeRange}`, {
          method: 'GET',
          headers: {
            'cookie': 'auth-token=valid-token',
            'x-forwarded-for': '127.0.0.1',
          },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.analytics.viewsOverTime).toHaveLength(expectedDays);
      }
    });

    it('should serve cached analytics when available', async () => {
      const cachedAnalytics = {
        totalViews: 100,
        totalDownloads: 50,
        totalShares: 25,
        activeLinks: 20,
        popularFiles: [],
        recentActivity: [],
        viewsOverTime: [],
      };

      CacheService.get.mockResolvedValue(cachedAnalytics);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analytics).toEqual(cachedAnalytics);
      expect(data.cached).toBe(true);
      expect(SharedLinkService.getUserSharedLinks).not.toHaveBeenCalled();
      expect(FileService.getUserFiles).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle invalid authentication tokens', async () => {
      AuthService.verifyToken.mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=invalid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('should apply rate limiting', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 900000,
      });

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should compress large analytics responses', async () => {
      // Create large dataset to trigger compression
      const largeSharedLinks = Array.from({ length: 100 }, (_, i) => ({
        id: `link${i}`,
        fileId: `file${i}`,
        views: Math.floor(Math.random() * 100),
        downloads: Math.floor(Math.random() * 50),
        isActive: true,
        expiresAt: null,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        file: { fileName: `document${i}.pdf` },
      }));

      SharedLinkService.getUserSharedLinks.mockResolvedValue(largeSharedLinks);
      FileService.getUserFiles.mockResolvedValue([]);

      const mockCompressed = Buffer.from('compressed-large-response');
      CompressionService.compress.mockResolvedValue({
        success: true,
        data: mockCompressed,
        encoding: 'gzip',
        compressedSize: mockCompressed.length,
      });

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(CompressionService.compress).toHaveBeenCalled();
      expect(response.headers.get('Content-Encoding')).toBe('gzip');
    });

    it('should calculate popular files correctly', async () => {
      const mockSharedLinks = [
        {
          id: 'link1',
          views: 100,
          downloads: 50,
          file: { fileName: 'popular.pdf' },
        },
        {
          id: 'link2',
          views: 20,
          downloads: 10,
          file: { fileName: 'moderate.docx' },
        },
        {
          id: 'link3',
          views: 5,
          downloads: 2,
          file: { fileName: 'unpopular.txt' },
        },
      ];

      SharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics.popularFiles).toHaveLength(3);
      
      // Should be sorted by total engagement (views + downloads)
      expect(data.analytics.popularFiles[0].fileName).toBe('popular.pdf');
      expect(data.analytics.popularFiles[0].views).toBe(100);
      expect(data.analytics.popularFiles[0].downloads).toBe(50);
      
      expect(data.analytics.popularFiles[1].fileName).toBe('moderate.docx');
      expect(data.analytics.popularFiles[2].fileName).toBe('unpopular.txt');
    });

    it('should filter active links correctly', async () => {
      const mockSharedLinks = [
        {
          id: 'link1',
          views: 10,
          downloads: 5,
          isActive: true,
          expiresAt: null, // Never expires
          file: { fileName: 'active1.pdf' },
        },
        {
          id: 'link2',
          views: 20,
          downloads: 8,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires tomorrow
          file: { fileName: 'active2.docx' },
        },
        {
          id: 'link3',
          views: 15,
          downloads: 3,
          isActive: true,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
          file: { fileName: 'expired.txt' },
        },
        {
          id: 'link4',
          views: 25,
          downloads: 12,
          isActive: false, // Deactivated
          expiresAt: null,
          file: { fileName: 'inactive.pdf' },
        },
      ];

      SharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics.activeLinks).toBe(2); // Only active1 and active2 are active and not expired
      expect(data.analytics.totalShares).toBe(4); // All links count as shares
    });

    it('should generate recent activity from shared links', async () => {
      const mockSharedLinks = [
        {
          id: 'link1',
          views: 10,
          downloads: 5,
          file: { fileName: 'recent1.pdf' },
        },
        {
          id: 'link2',
          views: 20,
          downloads: 8,
          file: { fileName: 'recent2.docx' },
        },
      ];

      SharedLinkService.getUserSharedLinks.mockResolvedValue(mockSharedLinks);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics.recentActivity).toHaveLength(2);
      
      data.analytics.recentActivity.forEach(activity => {
        expect(activity.id).toBeDefined();
        expect(['view', 'download', 'share']).toContain(activity.type);
        expect(activity.fileName).toBeDefined();
        expect(activity.timestamp).toBeDefined();
        expect(activity.userAgent).toBeDefined();
      });
    });

    it('should handle database errors gracefully', async () => {
      SharedLinkService.getUserSharedLinks.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should track analytics viewing for metrics', async () => {
      const mockJobQueue = require('@/lib/job-queue').jobQueue;
      
      SharedLinkService.getUserSharedLinks.mockResolvedValue([]);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics?timeRange=7d', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
      });

      await GET(request);

      expect(mockJobQueue.addJob).toHaveBeenCalledWith('analytics-processing', 
        expect.objectContaining({
          type: 'analytics_view',
          userId: 'user123',
          timeRange: '7d',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Test Browser',
          cached: false,
        })
      );
    });

    it('should set proper cache headers and CDN optimization', async () => {
      SharedLinkService.getUserSharedLinks.mockResolvedValue([]);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(CacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('analytics:user123:'),
        expect.any(Object),
        300 // 5 minutes cache
      );
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle empty analytics data', async () => {
      SharedLinkService.getUserSharedLinks.mockResolvedValue([]);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics.totalViews).toBe(0);
      expect(data.analytics.totalDownloads).toBe(0);
      expect(data.analytics.totalShares).toBe(0);
      expect(data.analytics.activeLinks).toBe(0);
      expect(data.analytics.popularFiles).toHaveLength(0);
      expect(data.analytics.recentActivity).toHaveLength(0);
      expect(data.analytics.viewsOverTime).toHaveLength(30); // Still generates time series
    });

    it('should handle malformed shared link data', async () => {
      const malformedSharedLinks = [
        { id: 'link1' }, // Missing required fields
        { id: 'link2', views: 'invalid', downloads: null },
        { id: 'link3', views: 10, downloads: 5, file: null },
      ];

      SharedLinkService.getUserSharedLinks.mockResolvedValue(malformedSharedLinks);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should handle malformed data gracefully without crashing
      expect(typeof data.analytics.totalViews).toBe('number');
      expect(typeof data.analytics.totalDownloads).toBe('number');
    });

    it('should limit popular files to top 5', async () => {
      const manySharedLinks = Array.from({ length: 20 }, (_, i) => ({
        id: `link${i}`,
        views: Math.floor(Math.random() * 100),
        downloads: Math.floor(Math.random() * 50),
        file: { fileName: `file${i}.pdf` },
      }));

      SharedLinkService.getUserSharedLinks.mockResolvedValue(manySharedLinks);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics.popularFiles).toHaveLength(5); // Limited to top 5
    });

    it('should limit recent activity to 10 items', async () => {
      const manySharedLinks = Array.from({ length: 50 }, (_, i) => ({
        id: `link${i}`,
        views: 1,
        downloads: 1,
        file: { fileName: `file${i}.pdf` },
      }));

      SharedLinkService.getUserSharedLinks.mockResolvedValue(manySharedLinks);
      FileService.getUserFiles.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard/analytics', {
        method: 'GET',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics.recentActivity).toHaveLength(10); // Limited to 10 items
    });
  });
});
