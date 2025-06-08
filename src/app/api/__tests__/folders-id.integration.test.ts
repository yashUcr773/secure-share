// Integration tests for individual folder operations API
import { NextRequest } from 'next/server';
import { 
  GET as folderGET, 
  PUT as folderPUT, 
  DELETE as folderDELETE,
  OPTIONS as folderOPTIONS 
} from '@/app/api/folders/[id]/route';

// Mock dependencies
jest.mock('@/lib/database', () => ({
  FolderService: {
    getFolderById: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
    getFolderContents: jest.fn(),
    verifyFolderOwnership: jest.fn(),
  },
  RateLimitService: {
    checkRateLimit: jest.fn(),
    recordAttempt: jest.fn(),
  },
}));

jest.mock('@/lib/auth-enhanced', () => ({
  AuthService: {
    verifyToken: jest.fn(),
  },
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
    invalidateFolderCache: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/lib/compression', () => ({
  CompressionService: {
    compressResponse: jest.fn(),
  },
}));

jest.mock('@/lib/cdn', () => ({
  CDNService: {
    invalidateFolderCache: jest.fn(),
  },
}));

jest.mock('@/lib/job-queue', () => ({
  jobQueue: {
    add: jest.fn(),
  },
}));

jest.mock('@/lib/rate-limit', () => ({
  getClientIP: jest.fn(),
}));

import { FolderService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { 
  addSecurityHeaders, 
  validateOrigin, 
  handleCORSPreflight, 
  sanitizeInput,
  validateCSRFWithSession 
} from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { jobQueue } from '@/lib/job-queue';
import { getClientIP } from '@/lib/rate-limit';

const mockFolderService = FolderService as jest.Mocked<typeof FolderService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockAddSecurityHeaders = addSecurityHeaders as jest.Mock;
const mockValidateOrigin = validateOrigin as jest.Mock;
const mockHandleCORS = handleCORSPreflight as jest.Mock;
const mockSanitizeInput = sanitizeInput as jest.Mock;
const mockValidateCSRF = validateCSRFWithSession as jest.Mock;
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
const mockCompressionService = CompressionService as jest.Mocked<typeof CompressionService>;
const mockCDNService = CDNService as jest.Mocked<typeof CDNService>;
const mockJobQueue = jobQueue as jest.Mocked<typeof jobQueue>;
const mockGetClientIP = getClientIP as jest.Mock;

describe('Individual Folder Operations API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockFolder = {
    id: 'folder-456',
    name: 'Test Folder',
    parentId: null,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockAddSecurityHeaders.mockImplementation((response) => response);
    mockValidateOrigin.mockReturnValue(true);
    mockSanitizeInput.mockImplementation((input) => input);
    mockValidateCSRF.mockResolvedValue(true);
    mockGetClientIP.mockReturnValue('127.0.0.1');
    
    mockAuthService.verifyToken.mockResolvedValue(mockUser);
    mockRateLimitService.checkRateLimit.mockResolvedValue(true);
    
    mockFolderService.verifyFolderOwnership.mockResolvedValue(true);
    mockFolderService.getFolderById.mockResolvedValue(mockFolder);
    
    mockCacheService.get.mockResolvedValue(null);
    mockCompressionService.compressResponse.mockImplementation((data) => data);
  });

  const createMockRequest = (method: string, folderId: string, body?: any, headers?: Record<string, string>) => {
    const url = `https://localhost:3000/api/folders/${folderId}`;
    const requestOptions: RequestInit = {
      method,
      headers: {
        'content-type': 'application/json',
        'origin': 'https://localhost:3000',
        'cookie': 'auth-token=valid-token',
        ...headers,
      },
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    // Mock the params in the request context
    const request = new NextRequest(url, requestOptions);
    (request as any).params = { id: folderId };
    
    return request;
  };

  describe('GET /api/folders/[id]', () => {
    describe('✅ Success Cases', () => {
      test('should retrieve folder with details and contents', async () => {
        const folderContents = {
          files: [
            { id: 'file-1', name: 'document.pdf', size: 1024 },
            { id: 'file-2', name: 'image.jpg', size: 2048 },
          ],
          subfolders: [
            { id: 'folder-sub-1', name: 'Subfolder 1' },
          ],
        };

        mockFolderService.getFolderContents.mockResolvedValueOnce(folderContents);

        const request = createMockRequest('GET', 'folder-456');
        const response = await folderGET(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.folder).toEqual(mockFolder);
        expect(data.contents).toEqual(folderContents);
        expect(mockFolderService.getFolderById).toHaveBeenCalledWith('folder-456');
        expect(mockFolderService.getFolderContents).toHaveBeenCalledWith('folder-456');
      });

      test('should use cached folder data when available', async () => {
        const cachedData = {
          folder: mockFolder,
          contents: { files: [], subfolders: [] },
        };
        
        mockCacheService.get.mockResolvedValueOnce(cachedData);

        const request = createMockRequest('GET', 'folder-456');
        const response = await folderGET(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(cachedData);
        expect(mockFolderService.getFolderById).not.toHaveBeenCalled();
      });

      test('should handle folder with compression', async () => {
        const largeContents = {
          files: Array.from({ length: 100 }, (_, i) => ({
            id: `file-${i}`,
            name: `document-${i}.pdf`,
            size: 1024 * i,
          })),
          subfolders: [],
        };

        mockFolderService.getFolderContents.mockResolvedValueOnce(largeContents);
        mockCompressionService.compressResponse.mockReturnValueOnce('compressed-data');

        const request = createMockRequest('GET', 'folder-456');
        const response = await folderGET(request, { params: { id: 'folder-456' } });

        expect(response.status).toBe(200);
        expect(mockCompressionService.compressResponse).toHaveBeenCalled();
      });
    });

    describe('❌ Error Cases', () => {
      test('should return 401 for unauthenticated request', async () => {
        mockAuthService.verifyToken.mockResolvedValueOnce(null);

        const request = createMockRequest('GET', 'folder-456');
        const response = await folderGET(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });

      test('should return 403 for folder not owned by user', async () => {
        mockFolderService.verifyFolderOwnership.mockResolvedValueOnce(false);

        const request = createMockRequest('GET', 'folder-456');
        const response = await folderGET(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied to this folder');
      });

      test('should return 404 for non-existent folder', async () => {
        mockFolderService.getFolderById.mockResolvedValueOnce(null);

        const request = createMockRequest('GET', 'folder-456');
        const response = await folderGET(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Folder not found');
      });

      test('should handle rate limiting', async () => {
        mockRateLimitService.checkRateLimit.mockResolvedValueOnce(false);

        const request = createMockRequest('GET', 'folder-456');
        const response = await folderGET(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toContain('Too many requests');
      });
    });
  });

  describe('PUT /api/folders/[id]', () => {
    describe('✅ Success Cases', () => {
      test('should update folder name successfully', async () => {
        const updateData = { name: 'Updated Folder Name' };
        const updatedFolder = { ...mockFolder, name: 'Updated Folder Name' };
        
        mockFolderService.updateFolder.mockResolvedValueOnce(updatedFolder);

        const request = createMockRequest('PUT', 'folder-456', updateData);
        const response = await folderPUT(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.folder).toEqual(updatedFolder);
        expect(mockFolderService.updateFolder).toHaveBeenCalledWith('folder-456', updateData);
        expect(mockCacheService.invalidateFolderCache).toHaveBeenCalledWith('folder-456');
      });

      test('should update folder parent successfully', async () => {
        const updateData = { parentId: 'parent-folder-789' };
        const updatedFolder = { ...mockFolder, parentId: 'parent-folder-789' };
        
        mockFolderService.updateFolder.mockResolvedValueOnce(updatedFolder);

        const request = createMockRequest('PUT', 'folder-456', updateData);
        const response = await folderPUT(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.folder).toEqual(updatedFolder);
        expect(mockJobQueue.add).toHaveBeenCalledWith('folder-moved', expect.any(Object));
      });

      test('should sanitize input data', async () => {
        const maliciousData = { name: '<script>alert("xss")</script>Folder' };
        const sanitizedData = { name: 'Folder' };
        
        mockSanitizeInput.mockReturnValueOnce(sanitizedData.name);
        mockFolderService.updateFolder.mockResolvedValueOnce(mockFolder);

        const request = createMockRequest('PUT', 'folder-456', maliciousData);
        await folderPUT(request, { params: { id: 'folder-456' } });

        expect(mockSanitizeInput).toHaveBeenCalledWith(maliciousData.name);
      });
    });

    describe('❌ Error Cases', () => {
      test('should validate CSRF token', async () => {
        mockValidateCSRF.mockResolvedValueOnce(false);

        const request = createMockRequest('PUT', 'folder-456', { name: 'Test' });
        const response = await folderPUT(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Invalid CSRF token');
      });

      test('should validate folder name length', async () => {
        const invalidData = { name: 'a'.repeat(300) }; // Too long

        const request = createMockRequest('PUT', 'folder-456', invalidData);
        const response = await folderPUT(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Folder name too long');
      });

      test('should handle database update failure', async () => {
        mockFolderService.updateFolder.mockRejectedValueOnce(new Error('Database error'));

        const request = createMockRequest('PUT', 'folder-456', { name: 'Test' });
        const response = await folderPUT(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to update folder');
      });
    });
  });

  describe('DELETE /api/folders/[id]', () => {
    describe('✅ Success Cases', () => {
      test('should delete empty folder successfully', async () => {
        mockFolderService.deleteFolder.mockResolvedValueOnce({ success: true });

        const request = createMockRequest('DELETE', 'folder-456');
        const response = await folderDELETE(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Folder deleted successfully');
        expect(mockFolderService.deleteFolder).toHaveBeenCalledWith('folder-456');
        expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith('user-123');
      });

      test('should invalidate CDN cache on deletion', async () => {
        mockFolderService.deleteFolder.mockResolvedValueOnce({ success: true });

        const request = createMockRequest('DELETE', 'folder-456');
        await folderDELETE(request, { params: { id: 'folder-456' } });

        expect(mockCDNService.invalidateFolderCache).toHaveBeenCalledWith('folder-456');
      });

      test('should queue cleanup jobs', async () => {
        mockFolderService.deleteFolder.mockResolvedValueOnce({ success: true });

        const request = createMockRequest('DELETE', 'folder-456');
        await folderDELETE(request, { params: { id: 'folder-456' } });

        expect(mockJobQueue.add).toHaveBeenCalledWith('folder-deleted', expect.any(Object));
      });
    });

    describe('❌ Error Cases', () => {
      test('should prevent deletion of non-empty folder', async () => {
        mockFolderService.deleteFolder.mockResolvedValueOnce({ 
          success: false, 
          error: 'Folder is not empty' 
        });

        const request = createMockRequest('DELETE', 'folder-456');
        const response = await folderDELETE(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Folder is not empty');
      });

      test('should handle deletion of non-existent folder', async () => {
        mockFolderService.verifyFolderOwnership.mockResolvedValueOnce(false);

        const request = createMockRequest('DELETE', 'folder-456');
        const response = await folderDELETE(request, { params: { id: 'folder-456' } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied to this folder');
      });
    });
  });

  describe('OPTIONS /api/folders/[id]', () => {
    test('should handle CORS preflight', async () => {
      const mockResponse = new Response(null, { status: 200 });
      mockHandleCORS.mockReturnValueOnce(mockResponse);

      const request = createMockRequest('OPTIONS', 'folder-456');
      const response = await folderOPTIONS(request);

      expect(response.status).toBe(200);
      expect(mockHandleCORS).toHaveBeenCalledWith(request);
      expect(mockAddSecurityHeaders).toHaveBeenCalled();
    });
  });

  describe('🔒 Security Features', () => {
    test('should apply security headers to all responses', async () => {
      const request = createMockRequest('GET', 'folder-456');
      await folderGET(request, { params: { id: 'folder-456' } });

      expect(mockAddSecurityHeaders).toHaveBeenCalled();
    });

    test('should validate origin for cross-origin requests', async () => {
      const request = createMockRequest('GET', 'folder-456', undefined, {
        'origin': 'https://malicious-site.com',
      });

      mockValidateOrigin.mockReturnValueOnce(false);
      const response = await folderGET(request, { params: { id: 'folder-456' } });

      expect(response.status).toBe(403);
    });

    test('should track rate limiting per IP', async () => {
      const request = createMockRequest('GET', 'folder-456');
      await folderGET(request, { params: { id: 'folder-456' } });

      expect(mockGetClientIP).toHaveBeenCalledWith(request);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    test('should handle malformed folder ID', async () => {
      const request = createMockRequest('GET', '');
      const response = await folderGET(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid folder ID');
    });

    test('should handle very long folder names', async () => {
      const longName = 'a'.repeat(1000);
      const request = createMockRequest('PUT', 'folder-456', { name: longName });
      const response = await folderPUT(request, { params: { id: 'folder-456' } });

      expect(response.status).toBe(400);
    });

    test('should handle concurrent folder operations', async () => {
      const requests = Array.from({ length: 5 }, () => 
        createMockRequest('GET', 'folder-456')
      );

      const responses = await Promise.all(
        requests.map(req => folderGET(req, { params: { id: 'folder-456' } }))
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('🔄 Integration Scenarios', () => {
    test('should handle complete folder update workflow', async () => {
      // 1. Get folder
      const getRequest = createMockRequest('GET', 'folder-456');
      const getResponse = await folderGET(getRequest, { params: { id: 'folder-456' } });
      expect(getResponse.status).toBe(200);

      // 2. Update folder
      const updateData = { name: 'Updated Name' };
      const updatedFolder = { ...mockFolder, name: 'Updated Name' };
      mockFolderService.updateFolder.mockResolvedValueOnce(updatedFolder);

      const putRequest = createMockRequest('PUT', 'folder-456', updateData);
      const putResponse = await folderPUT(putRequest, { params: { id: 'folder-456' } });
      expect(putResponse.status).toBe(200);

      // 3. Verify cache invalidation
      expect(mockCacheService.invalidateFolderCache).toHaveBeenCalledWith('folder-456');
    });

    test('should handle folder deletion with cleanup', async () => {
      mockFolderService.deleteFolder.mockResolvedValueOnce({ success: true });

      const request = createMockRequest('DELETE', 'folder-456');
      const response = await folderDELETE(request, { params: { id: 'folder-456' } });

      expect(response.status).toBe(200);
      expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith('user-123');
      expect(mockCDNService.invalidateFolderCache).toHaveBeenCalledWith('folder-456');
      expect(mockJobQueue.add).toHaveBeenCalledWith('folder-deleted', expect.any(Object));
    });
  });
});
