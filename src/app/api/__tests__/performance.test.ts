/**
 * Performance Tests for SecureShare API Endpoints
 * Tests load capacity, response times, and throughput for critical endpoints
 */

import { NextRequest } from 'next/server';
import { GET as FilesGET, POST as FilesUpload } from '../files/route';
import { GET as DashboardGET } from '../dashboard/route';
import { POST as ContactPOST } from '../contact/route';

// Mock implementations
jest.mock('@/lib/auth-enhanced', () => ({
  authService: {
    verifyToken: jest.fn(),
    getUser: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  file: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  contactMessage: {
    create: jest.fn(),
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
  } = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/test');
  
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const request = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
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
  passwordHash: 'hashed-password',
  isActive: true,
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpiry: null,
  passwordResetToken: null,
  passwordResetTokenExpiry: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockFile = {
  id: 'file-123',
  filename: 'test.pdf',
  originalName: 'test-document.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  path: '/uploads/file-123.pdf',
  uploadedBy: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isPublic: false,
  downloadCount: 0,
  lastDownloaded: null,
  user: mockUser,
};

describe('Performance Tests', () => {
  let mockPrisma: any;
  let mockAuthService: any;
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = require('@/lib/prisma');
    mockAuthService = require('@/lib/auth-enhanced').authService;
    mockStorage = require('@/lib/storage');

    // Default successful authentication
    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      payload: { userId: mockUser.id },
      user: undefined,
    });
    mockAuthService.getUser.mockResolvedValue(mockUser);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  });

  describe('File Upload Performance', () => {
    beforeEach(() => {
      mockStorage.uploadFile.mockResolvedValue({
        filename: 'uploaded-file.pdf',
        path: '/uploads/uploaded-file.pdf',
        size: 1024000,
      });
      mockPrisma.file.create.mockResolvedValue(mockFile);
    });

    it('should handle multiple concurrent file uploads', async () => {
      const concurrentUploads = 10;
      const uploadPromises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentUploads; i++) {
        const formData = new FormData();
        formData.append('file', new Blob(['test content'], { type: 'text/plain' }), `test-${i}.txt`);
        
        const request = new NextRequest('http://localhost:3000/api/files', {
          method: 'POST',
          body: formData,
        });

        Object.defineProperty(request, 'cookies', {
          value: {
            get: () => ({ value: 'valid-token' }),
          },
        });

        uploadPromises.push(FilesUpload(request));
      }

      const responses = await Promise.all(uploadPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockStorage.uploadFile).toHaveBeenCalledTimes(concurrentUploads);
      expect(mockPrisma.file.create).toHaveBeenCalledTimes(concurrentUploads);

      console.log(`✅ Concurrent uploads test: ${concurrentUploads} uploads completed in ${totalTime}ms`);
    }, 10000);

    it('should handle large file uploads efficiently', async () => {
      const largeFileSize = 10 * 1024 * 1024; // 10MB
      const largeFileContent = new Array(largeFileSize).fill('x').join('');
      
      mockStorage.uploadFile.mockResolvedValue({
        filename: 'large-file.pdf',
        path: '/uploads/large-file.pdf',
        size: largeFileSize,
      });

      const formData = new FormData();
      formData.append('file', new Blob([largeFileContent], { type: 'application/pdf' }), 'large-file.pdf');
      
      const request = new NextRequest('http://localhost:3000/api/files', {
        method: 'POST',
        body: formData,
      });

      Object.defineProperty(request, 'cookies', {
        value: {
          get: () => ({ value: 'valid-token' }),
        },
      });

      const startTime = Date.now();
      const response = await FilesUpload(request);
      const endTime = Date.now();
      const uploadTime = endTime - startTime;

      expect(response.status).toBe(201);
      expect(uploadTime).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`✅ Large file upload test: ${largeFileSize} bytes uploaded in ${uploadTime}ms`);
    }, 15000);
  });

  describe('API Endpoint Response Times', () => {
    it('should respond to file listing requests quickly', async () => {
      const fileCount = 100;
      const mockFiles = Array.from({ length: fileCount }, (_, i) => ({
        ...mockFile,
        id: `file-${i}`,
        filename: `test-${i}.pdf`,
      }));

      mockPrisma.file.findMany.mockResolvedValue(mockFiles);

      const iterations = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'valid-token' },
          searchParams: { page: '1', limit: '20' },
        });

        const startTime = Date.now();
        const response = await FilesGET(request);
        const endTime = Date.now();
        
        responseTimes.push(endTime - startTime);
        expect(response.status).toBe(200);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      // Performance assertions
      expect(averageResponseTime).toBeLessThan(100); // Average should be under 100ms
      expect(maxResponseTime).toBeLessThan(500); // Max should be under 500ms

      console.log(`✅ File listing performance:`);
      console.log(`   - Average response time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`   - Max response time: ${maxResponseTime}ms`);
      console.log(`   - Min response time: ${minResponseTime}ms`);
    });

    it('should handle dashboard data requests efficiently', async () => {
      const mockDashboardData = {
        totalFiles: 500,
        totalSize: 1024000000,
        recentFiles: Array.from({ length: 10 }, (_, i) => ({
          ...mockFile,
          id: `recent-${i}`,
        })),
        storageUsage: [
          { date: '2024-01-01', size: 100000000 },
          { date: '2024-01-02', size: 200000000 },
        ],
      };

      mockPrisma.file.findMany.mockResolvedValue(mockDashboardData.recentFiles);

      const iterations = 30;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'valid-token' },
        });

        const startTime = Date.now();
        const response = await DashboardGET(request);
        const endTime = Date.now();
        
        responseTimes.push(endTime - startTime);
        expect(response.status).toBe(200);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      // Performance assertions
      expect(averageResponseTime).toBeLessThan(150); // Average should be under 150ms
      expect(p95ResponseTime).toBeLessThan(300); // 95th percentile should be under 300ms

      console.log(`✅ Dashboard performance:`);
      console.log(`   - Average response time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`   - 95th percentile: ${p95ResponseTime}ms`);
    });
  });

  describe('Load Testing', () => {
    it('should handle high concurrent request load', async () => {
      mockPrisma.file.findMany.mockResolvedValue([mockFile]);
      
      const concurrentRequests = 100;
      const requestPromises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'valid-token' },
        });

        requestPromises.push(FilesGET(request));
      }

      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(concurrentRequests);

      // Performance assertions
      const requestsPerSecond = (concurrentRequests / totalTime) * 1000;
      expect(requestsPerSecond).toBeGreaterThan(50); // At least 50 requests/second
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`✅ Load test results:`);
      console.log(`   - ${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
      console.log(`   - Throughput: ${requestsPerSecond.toFixed(2)} requests/second`);
    });

    it('should handle contact form submission load', async () => {
      mockPrisma.contactMessage.create.mockResolvedValue({
        id: 'message-123',
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content',
        createdAt: new Date(),
      });

      const concurrentSubmissions = 50;
      const submissionPromises = [];

      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Load Test Subject',
        message: 'This is a load test message',
      };

      const startTime = Date.now();

      for (let i = 0; i < concurrentSubmissions; i++) {
        const request = createMockRequest('POST', contactData);
        submissionPromises.push(ContactPOST(request));
      }

      const responses = await Promise.all(submissionPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All submissions should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Performance assertions
      expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(mockPrisma.contactMessage.create).toHaveBeenCalledTimes(concurrentSubmissions);

      console.log(`✅ Contact form load test: ${concurrentSubmissions} submissions completed in ${totalTime}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during repeated requests', async () => {
      mockPrisma.file.findMany.mockResolvedValue([mockFile]);

      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'valid-token' },
        });

        const response = await FilesGET(request);
        expect(response.status).toBe(200);

        // Force garbage collection every 100 iterations
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePerRequest = memoryIncrease / iterations;

      // Memory increase should be reasonable (less than 1KB per request)
      expect(memoryIncreasePerRequest).toBeLessThan(1024);

      console.log(`✅ Memory usage test:`);
      console.log(`   - Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - Memory per request: ${memoryIncreasePerRequest.toFixed(2)} bytes`);
    }, 30000);
  });
});
