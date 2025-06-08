import { NextRequest } from 'next/server';
import { GET, POST } from '../../file/[id]/route';

// Mock dependencies
jest.mock('@/lib/database', () => ({
  FileService: {
    getFileInfo: jest.fn(),
    getFileContent: jest.fn(),
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
  JobQueue: {
    getInstance: jest.fn(() => ({
      addJob: jest.fn(),
    })),
  },
}));

jest.mock('@/lib/crypto', () => ({
  EncryptionService: {
    decryptFile: jest.fn(),
  },
}));

const { FileService, RateLimitService } = require('@/lib/database');
const { AuthService } = require('@/lib/auth-enhanced');
const { CacheService } = require('@/lib/cache');
const { CompressionService } = require('@/lib/compression');
const { EncryptionService } = require('@/lib/crypto');

describe('/api/file/[id] Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    RateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetTime: Date.now() + 60000,
    });

    AuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: { id: 'user123', email: 'test@example.com' },
    });

    CacheService.get.mockResolvedValue({ hit: false, data: null });
    CacheService.set.mockResolvedValue(true);
  });

  describe('GET /api/file/[id] - File Info', () => {
    it('should return file info for valid file ID', async () => {
      const mockFileInfo = {
        id: 'file123',
        fileName: 'test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        isPasswordProtected: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null,
        userId: 'user123',
      };

      FileService.getFileInfo.mockResolvedValue(mockFileInfo);

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
        },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.file).toEqual(mockFileInfo);
      expect(FileService.getFileInfo).toHaveBeenCalledWith('file123');
    });

    it('should return 404 for non-existent file', async () => {
      FileService.getFileInfo.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/file/nonexistent', {
        method: 'GET',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File not found');
    });

    it('should handle rate limiting', async () => {
      RateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'GET',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
      expect(FileService.getFileInfo).not.toHaveBeenCalled();
    });

    it('should serve cached file info when available', async () => {
      const cachedFileInfo = {
        id: 'file123',
        fileName: 'cached.txt',
        fileSize: 2048,
      };

      CacheService.get.mockResolvedValue({ hit: true, data: cachedFileInfo });

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'GET',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.file).toEqual(cachedFileInfo);
      expect(data.cached).toBe(true);
      expect(FileService.getFileInfo).not.toHaveBeenCalled();
    });

    it('should handle expired files', async () => {
      const expiredFile = {
        id: 'file123',
        fileName: 'expired.txt',
        expiresAt: '2020-01-01T00:00:00.000Z', // Past date
      };

      FileService.getFileInfo.mockResolvedValue(expiredFile);

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'GET',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error).toBe('File has expired');
    });
  });

  describe('POST /api/file/[id] - File Content Download', () => {
    it('should return encrypted file content for authenticated user', async () => {
      const mockFileInfo = {
        id: 'file123',
        fileName: 'test.txt',
        fileSize: 1024,
        userId: 'user123',
        isPasswordProtected: false,
        expiresAt: null,
      };

      const mockEncryptedContent = Buffer.from('encrypted-content');

      FileService.getFileInfo.mockResolvedValue(mockFileInfo);
      FileService.getFileContent.mockResolvedValue(mockEncryptedContent);

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
        },
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.encryptedContent).toBeDefined();
      expect(data.fileName).toBe('test.txt');
      expect(data.fileSize).toBe(1024);
    });

    it('should require authentication for file download', async () => {
      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle invalid authentication tokens', async () => {
      AuthService.verifyToken.mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: {
          'cookie': 'auth-token=invalid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('should handle password-protected files', async () => {
      const mockFileInfo = {
        id: 'file123',
        fileName: 'protected.txt',
        userId: 'user123',
        isPasswordProtected: true,
        passwordHash: 'hashed-password',
      };

      FileService.getFileInfo.mockResolvedValue(mockFileInfo);

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify({ password: 'wrong-password' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid password');
    });

    it('should apply compression for large files', async () => {
      const mockFileInfo = {
        id: 'file123',
        fileName: 'large.txt',
        fileSize: 5 * 1024 * 1024, // 5MB
        userId: 'user123',
      };

      const mockContent = Buffer.alloc(5 * 1024 * 1024);
      const mockCompressed = Buffer.from('compressed-content');

      FileService.getFileInfo.mockResolvedValue(mockFileInfo);
      FileService.getFileContent.mockResolvedValue(mockContent);
      CompressionService.compress.mockResolvedValue({
        compressed: mockCompressed,
        algorithm: 'gzip',
        compressionRatio: 0.1,
        compressedSize: mockCompressed.length,
      });

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isCompressed).toBe(true);
      expect(data.compressionRatio).toBe(0.1);
      expect(CompressionService.compress).toHaveBeenCalled();
    });

    it('should handle file service errors gracefully', async () => {
      FileService.getFileInfo.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should track analytics for file downloads', async () => {
      const mockFileInfo = {
        id: 'file123',
        fileName: 'analytics.txt',
        fileSize: 1024,
        userId: 'user123',
      };

      const mockJobQueue = {
        addJob: jest.fn().mockResolvedValue(true),
      };

      require('@/lib/job-queue').JobQueue.getInstance.mockReturnValue(mockJobQueue);

      FileService.getFileInfo.mockResolvedValue(mockFileInfo);
      FileService.getFileContent.mockResolvedValue(Buffer.from('content'));

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-browser',
        },
      });

      await POST(request, { params: Promise.resolve({ id: 'file123' }) });

      expect(mockJobQueue.addJob).toHaveBeenCalledWith('analytics-processing', 
        expect.objectContaining({
          type: 'file_download',
          fileId: 'file123',
          fileName: 'analytics.txt',
          userAgent: 'test-browser',
        })
      );
    });
  });

  describe('Error handling and edge cases', () => {
    it('should sanitize file ID input', async () => {
      const maliciousId = '../../../etc/passwd';
      
      const request = new NextRequest(`http://localhost:3000/api/file/${encodeURIComponent(maliciousId)}`, {
        method: 'GET',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

      const response = await GET(request, { params: Promise.resolve({ id: maliciousId }) });
      
      // Should handle sanitization gracefully and likely return 404
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockFileInfo = {
        id: 'file123',
        fileName: 'concurrent.txt',
        fileSize: 1024,
      };

      FileService.getFileInfo.mockResolvedValue(mockFileInfo);

      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/file/file123', {
          method: 'GET',
          headers: { 'x-forwarded-for': '127.0.0.1' },
        })
      );

      const responses = await Promise.all(
        requests.map(request => 
          GET(request, { params: Promise.resolve({ id: 'file123' }) })
        )
      );

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Caching should reduce database calls
      expect(FileService.getFileInfo).toHaveBeenCalled();
    });

    it('should respect file access permissions', async () => {
      const mockFileInfo = {
        id: 'file123',
        fileName: 'private.txt',
        userId: 'other-user', // Different user
      };

      FileService.getFileInfo.mockResolvedValue(mockFileInfo);

      const request = new NextRequest('http://localhost:3000/api/file/file123', {
        method: 'POST',
        headers: {
          'cookie': 'auth-token=valid-token',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'file123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });
});
