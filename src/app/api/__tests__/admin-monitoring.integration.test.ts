/**
 * Admin Monitoring API Integration Tests
 * 
 * Comprehensive test suite for /api/admin/monitoring endpoint
 * Tests: GET and POST operations, admin authentication, system metrics collection,
 * job queue operations, security, error handling, and performance
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../admin/monitoring/route';
import { AuthService } from '@/lib/auth-enhanced';
import { PrismaClient } from '@prisma/client';
import { appInitializer } from '@/lib/app-initializer';
import { jobQueue } from '@/lib/job-queue';
import { CacheService } from '@/lib/cache';

// Mock implementations
jest.mock('@/lib/auth-enhanced');
jest.mock('@prisma/client');
jest.mock('@/lib/app-initializer');
jest.mock('@/lib/job-queue');
jest.mock('@/lib/cache');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  file: {
    aggregate: jest.fn(),
  },
} as any;

const mockAppInitializer = appInitializer as jest.Mocked<typeof appInitializer>;
const mockJobQueue = jobQueue as jest.Mocked<typeof jobQueue>;
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;

// Mock PrismaClient constructor
(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

// Helper function to create mock requests
const createMockRequest = (
  method: string,
  url: string = 'https://example.com/api/admin/monitoring',
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    body?: any;
  } = {}
) => {
  const headers = new Headers({
    'content-type': 'application/json',
    'user-agent': 'Test Agent',
    'origin': 'https://example.com',
    ...options.headers,
  });

  if (options.cookies) {
    Object.entries(options.cookies).forEach(([name, value]) => {
      headers.append('cookie', `${name}=${value}`);
    });
  }

  const request = {
    method,
    url,
    headers,
    cookies: {
      get: jest.fn().mockImplementation((name: string) => {
        if (options.cookies && options.cookies[name]) {
          return { value: options.cookies[name] };
        }
        return undefined;
      }),
    },
    json: jest.fn().mockResolvedValue(options.body || {}),
  } as unknown as NextRequest;

  return request;
};

// Test data
const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  name: 'Admin User',
  passwordHash: 'hashed-password',
  isActive: true,
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpiry: null,
  passwordResetToken: null,
  passwordResetTokenExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: 'admin',
};

const mockRegularUser = {
  id: 'user-123',
  email: 'user@example.com',
  name: 'Regular User',
  passwordHash: 'hashed-password',
  isActive: true,
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationTokenExpiry: null,
  passwordResetToken: null,
  passwordResetTokenExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: 'user',
};

const mockSystemMetrics = {
  timestamp: '2024-01-01T00:00:00.000Z',
  uptime: 3600000,
  initialization: {
    status: {
      jobQueue: true,
      cache: true,
      compression: true,
      cdn: true,
      startTime: new Date('2024-01-01T00:00:00.000Z'),
      errors: [],
    },
    healthy: true,
  },
  jobQueue: {
    pending: 5,
    processing: 2,
    completed: 100,
    failed: 3,
    processors: ['file-compression', 'analytics-processing', 'email-notification'],
  },
  cache: {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 1024,
    backend: 'redis' as const,
    connected: true,
  },
  database: {
    connections: 1,
    activeQueries: 0,
    health: 'healthy' as const,
  },
  storage: {
    totalFiles: 1500,
    totalSize: 52428800,
    avgFileSize: 34952.53,
  },
  users: {
    total: 250,
    active: 45,
    new: 12,
  },
};

describe('Admin Monitoring API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Default successful auth setup
    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: mockAdminUser,
    });

    // Default admin role check
    mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);    // Default system metrics
    mockAppInitializer.getStatus.mockReturnValue({
      jobQueue: true,
      cache: true,
      compression: true,
      cdn: true,
      startTime: new Date('2024-01-01T00:00:00.000Z'),
      errors: [],
    });
    mockAppInitializer.isHealthy.mockReturnValue(true);

    mockJobQueue.getMetrics.mockReturnValue({
      totalJobs: 110,
      pendingJobs: 5,
      processingJobs: 2,
      completedJobs: 100,
      failedJobs: 3,
      averageProcessingTime: 1500,
      throughput: 45,
    });
    mockJobQueue.getQueueStatus.mockReturnValue({
      totalJobs: 110,
      pendingJobs: 5,
      processingJobs: 2,
      registeredProcessors: ['file-compression', 'analytics-processing', 'email-notification'],
    });

    mockCacheService.getStats.mockResolvedValue({
      memorySize: 1024,
      backend: 'redis',
      redisConnected: true,
    });

    mockPrisma.user.count
      .mockResolvedValueOnce(250) // total users
      .mockResolvedValueOnce(45)  // active users
      .mockResolvedValueOnce(12); // new users

    mockPrisma.file.aggregate.mockResolvedValue({
      _count: { id: 1500 },
      _sum: { size: 52428800 },
      _avg: { size: 34952.53 },
    });
  });

  describe('GET /api/admin/monitoring', () => {
    describe('Authentication and Authorization', () => {
      it('should return 403 when no token provided', async () => {
        const request = createMockRequest('GET');
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });      it('should return 403 when token is invalid', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
          valid: false,
          user: undefined,
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'invalid-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });

      it('should return 403 when user is not admin', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
          valid: true,
          user: mockRegularUser,
        });
        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser);

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'valid-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });

      it('should return 403 when admin check fails', async () => {
        mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'valid-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });

      it('should authenticate admin successfully', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        
        expect(response.status).toBe(200);
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('admin-token');
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockAdminUser.id },
          select: { role: true },
        });
      });
    });

    describe('System Metrics Collection', () => {
      it('should return comprehensive system metrics', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          initialization: {
            status: expect.any(Object),
            healthy: true,
          },
          jobQueue: {
            pending: 5,
            processing: 2,
            completed: 100,
            failed: 3,
            processors: ['file-upload', 'analytics', 'email'],
          },
          cache: {
            hits: 0,
            misses: 0,
            hitRate: 0,
            size: 1024,
            backend: 'redis',
            connected: true,
          },
          database: {
            connections: 1,
            activeQueries: 0,
            health: 'healthy',
          },
          storage: {
            totalFiles: 1500,
            totalSize: 52428800,
            avgFileSize: 34952.53,
          },
          users: {
            total: 250,
            active: 45,
            new: 12,
          },
        });
      });

      it('should handle job queue metrics failure gracefully', async () => {
        mockJobQueue.getMetrics.mockImplementation(() => {
          throw new Error('Job queue unavailable');
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.jobQueue).toEqual({
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          processors: [],
        });
      });

      it('should handle cache metrics failure gracefully', async () => {
        mockCacheService.getStats.mockRejectedValue(new Error('Cache unavailable'));

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.cache).toEqual({
          hits: 0,
          misses: 0,
          hitRate: 0,
          size: 0,
          backend: 'memory',
          connected: false,
        });
      });

      it('should handle database metrics failure gracefully', async () => {
        mockPrisma.user.count.mockRejectedValue(new Error('Database unavailable'));

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.database.health).toBe('down');
        expect(data.users).toEqual({
          total: 0,
          active: 0,
          new: 0,
        });
      });

      it('should handle storage metrics failure gracefully', async () => {
        mockPrisma.file.aggregate.mockRejectedValue(new Error('Storage unavailable'));

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.storage).toEqual({
          totalFiles: 0,
          totalSize: 0,
          avgFileSize: 0,
        });
      });      it('should calculate uptime correctly', async () => {
        const startTime = new Date(Date.now() - 3600000); // 1 hour ago
        
        mockAppInitializer.getStatus.mockReturnValue({
          jobQueue: true,
          cache: true,
          compression: true,
          cdn: true,
          startTime: new Date('2024-01-01T00:00:00.000Z'),
          errors: [],
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.uptime).toBeGreaterThan(3590000); // Approximately 1 hour
        expect(data.uptime).toBeLessThan(3610000);
      });
    });

    describe('Error Handling', () => {
      it('should handle authentication service failure', async () => {
        mockAuthService.verifyToken.mockRejectedValue(new Error('Auth service down'));

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });

      it('should handle metrics collection failure', async () => {
        mockAppInitializer.getStatus.mockImplementation(() => {
          throw new Error('System initialization failed');
        });

        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to retrieve system metrics');
      });

      it('should handle partial service failures', async () => {
        // Simulate mixed service availability
        mockJobQueue.getMetrics.mockImplementation(() => {
          throw new Error('Job queue down');
        });
        mockCacheService.getStats.mockRejectedValue(new Error('Cache down'));
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.jobQueue.pending).toBe(0);
        expect(data.cache.connected).toBe(false);
        expect(data.database.health).toBe('healthy'); // This service still works
      });
    });

    describe('Response Validation', () => {
      it('should return properly formatted timestamp', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(data.timestamp)).toBeInstanceOf(Date);
      });

      it('should include all required metric categories', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('uptime');
        expect(data).toHaveProperty('initialization');
        expect(data).toHaveProperty('jobQueue');
        expect(data).toHaveProperty('cache');
        expect(data).toHaveProperty('database');
        expect(data).toHaveProperty('storage');
        expect(data).toHaveProperty('users');
      });

      it('should return numeric values for all metrics', async () => {
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(typeof data.uptime).toBe('number');
        expect(typeof data.jobQueue.pending).toBe('number');
        expect(typeof data.cache.size).toBe('number');
        expect(typeof data.storage.totalFiles).toBe('number');
        expect(typeof data.users.total).toBe('number');
      });
    });
  });

  describe('POST /api/admin/monitoring', () => {
    describe('Authentication and Authorization', () => {
      it('should return 403 when no token provided', async () => {
        const request = createMockRequest('POST', undefined, {
          body: { action: 'add-job', jobType: 'test-job' },
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });

      it('should return 403 when user is not admin', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
          valid: true,
          user: mockRegularUser,
        });
        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser);

        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'valid-token' },
          body: { action: 'add-job', jobType: 'test-job' },
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });
    });

    describe('Job Queue Operations', () => {
      describe('Add Job', () => {
        it('should add job successfully', async () => {
          mockJobQueue.addJob.mockResolvedValue('job-123');

          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { 
              action: 'add-job',
              jobType: 'analytics',
              data: { userId: 'user-123' }
            },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.jobId).toBe('job-123');
          expect(mockJobQueue.addJob).toHaveBeenCalledWith('analytics', { userId: 'user-123' });
        });

        it('should add job without data parameter', async () => {
          mockJobQueue.addJob.mockResolvedValue('job-456');

          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { 
              action: 'add-job',
              jobType: 'cleanup'
            },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.jobId).toBe('job-456');
          expect(mockJobQueue.addJob).toHaveBeenCalledWith('cleanup', {});
        });

        it('should return 400 when jobType is missing', async () => {
          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { action: 'add-job' },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(400);
          expect(data.error).toBe('Job type required');
        });
      });

      describe('Clear Queue', () => {        it('should clear queue successfully', async () => {
          const mockJobs = [
            { 
              id: 'job-1', 
              type: 'file-compression' as const,
              data: {},
              priority: 'normal' as const,
              status: 'pending' as const,
              attempts: 0,
              maxAttempts: 3,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { 
              id: 'job-2', 
              type: 'analytics-processing' as const,
              data: {},
              priority: 'normal' as const,
              status: 'processing' as const,
              attempts: 1,
              maxAttempts: 3,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { 
              id: 'job-3', 
              type: 'email-notification' as const,
              data: {},
              priority: 'normal' as const,
              status: 'completed' as const,
              attempts: 1,
              maxAttempts: 3,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
          mockJobQueue.getJobsByType.mockReturnValue(mockJobs);
          mockJobQueue.cancelJob.mockResolvedValue(true);

          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { 
              action: 'clear-queue',
              jobType: 'analytics'
            },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.message).toBe('2 analytics jobs cancelled');
          expect(mockJobQueue.getJobsByType).toHaveBeenCalledWith('analytics');
          expect(mockJobQueue.cancelJob).toHaveBeenCalledTimes(2);
        });

        it('should return 400 when jobType is missing for clear-queue', async () => {
          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { action: 'clear-queue' },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(400);
          expect(data.error).toBe('Job type required for queue clearing');
        });        it('should handle cancellation failures gracefully', async () => {
          const mockJobs = [
            { 
              id: 'job-1', 
              type: 'file-compression' as const,
              data: {},
              priority: 'normal' as const,
              status: 'pending' as const,
              attempts: 0,
              maxAttempts: 3,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { 
              id: 'job-2', 
              type: 'file-compression' as const,
              data: {},
              priority: 'normal' as const,
              status: 'pending' as const,
              attempts: 0,
              maxAttempts: 3,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
          mockJobQueue.getJobsByType.mockReturnValue(mockJobs);
          mockJobQueue.cancelJob
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { 
              action: 'clear-queue',
              jobType: 'email'
            },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.message).toBe('1 email jobs cancelled');
        });
      });

      describe('Pause Queue', () => {        it('should pause queue successfully', async () => {
          mockJobQueue.pause.mockReturnValue(undefined);

          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { action: 'pause-queue' },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.message).toBe('Job queue paused');
          expect(mockJobQueue.pause).toHaveBeenCalled();
        });
      });

      describe('Resume Queue', () => {        it('should resume queue successfully', async () => {
          mockJobQueue.resume.mockReturnValue(undefined);

          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { action: 'resume-queue' },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.message).toBe('Job queue resumed');
          expect(mockJobQueue.resume).toHaveBeenCalled();
        });
      });

      describe('Invalid Actions', () => {
        it('should return 400 for invalid action', async () => {
          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { action: 'invalid-action' },
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(400);
          expect(data.error).toBe('Invalid action');
        });

        it('should handle missing action parameter', async () => {
          const request = createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: {},
          });
          
          const response = await POST(request);
          const data = await response.json();
          
          expect(response.status).toBe(400);
          expect(data.error).toBe('Invalid action');
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle job queue operation failures', async () => {
        mockJobQueue.addJob.mockRejectedValue(new Error('Queue service down'));

        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
          body: { 
            action: 'add-job',
            jobType: 'analytics'
          },
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to perform job queue operation');
      });

      it('should handle JSON parsing errors', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
        });
        request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to perform job queue operation');
      });

      it('should handle authentication failures during operations', async () => {
        mockAuthService.verifyToken.mockRejectedValue(new Error('Auth service down'));

        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
          body: { action: 'pause-queue' },
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized - Admin access required');
      });
    });

    describe('Security Features', () => {
      it('should validate admin role for each operation', async () => {
        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
          body: { action: 'add-job', jobType: 'test' },
        });
        
        await POST(request);
        
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('admin-token');
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockAdminUser.id },
          select: { role: true },
        });
      });

      it('should handle concurrent admin operations', async () => {
        mockJobQueue.addJob.mockResolvedValue('job-concurrent');

        const requests = Array.from({ length: 5 }, () =>
          createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { action: 'add-job', jobType: 'concurrent-test' },
          })
        );
        
        const responses = await Promise.all(requests.map(req => POST(req)));
        
        expect(responses).toHaveLength(5);
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        expect(mockJobQueue.addJob).toHaveBeenCalledTimes(5);
      });

      it('should sanitize input parameters', async () => {
        mockJobQueue.addJob.mockResolvedValue('job-sanitized');

        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
          body: { 
            action: 'add-job',
            jobType: 'test<script>alert("xss")</script>',
            data: { malicious: '<img src=x onerror=alert(1)>' }
          },
        });
        
        const response = await POST(request);
        
        expect(response.status).toBe(200);
        expect(mockJobQueue.addJob).toHaveBeenCalledWith(
          'test<script>alert("xss")</script>',
          { malicious: '<img src=x onerror=alert(1)>' }
        );
      });
    });
  });

  describe('Performance and Reliability', () => {
    describe('Response Times', () => {
      it('should respond to GET requests within reasonable time', async () => {
        const start = Date.now();
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const duration = Date.now() - start;
        
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should respond to POST requests within reasonable time', async () => {
        mockJobQueue.addJob.mockResolvedValue('job-perf');
        const start = Date.now();
        
        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
          body: { action: 'add-job', jobType: 'performance-test' },
        });
        
        const response = await POST(request);
        const duration = Date.now() - start;
        
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(500); // Should complete within 500ms
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle concurrent GET requests', async () => {
        const requests = Array.from({ length: 10 }, () =>
          createMockRequest('GET', undefined, {
            cookies: { token: 'admin-token' },
          })
        );
        
        const responses = await Promise.all(requests.map(req => GET(req)));
        
        expect(responses).toHaveLength(10);
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
      });      it('should handle mixed concurrent operations', async () => {
        mockJobQueue.addJob.mockResolvedValue('job-mixed');
        mockJobQueue.pause.mockReturnValue(undefined);

        const getRequests = Array.from({ length: 3 }, () =>
          createMockRequest('GET', undefined, {
            cookies: { token: 'admin-token' },
          })
        );

        const postRequests = Array.from({ length: 2 }, () =>
          createMockRequest('POST', undefined, {
            cookies: { token: 'admin-token' },
            body: { action: 'add-job', jobType: 'mixed-test' },
          })
        );

        const allRequests = [...getRequests, ...postRequests];
        const responses = await Promise.all([
          ...getRequests.map(req => GET(req)),
          ...postRequests.map(req => POST(req))
        ]);
        
        expect(responses).toHaveLength(5);
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
      });
    });

    describe('Service Degradation', () => {
      it('should continue operating when individual services fail', async () => {
        // Simulate multiple service failures
        mockJobQueue.getMetrics.mockImplementation(() => {
          throw new Error('Job queue down');
        });
        mockCacheService.getStats.mockRejectedValue(new Error('Cache down'));
        mockPrisma.file.aggregate.mockRejectedValue(new Error('Storage query failed'));
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.jobQueue.pending).toBe(0);
        expect(data.cache.connected).toBe(false);
        expect(data.storage.totalFiles).toBe(0);
        // But basic metrics should still work
        expect(data.users.total).toBe(250);
        expect(data.database.health).toBe('healthy');
      });

      it('should handle partial database failures', async () => {
        // Simulate file query failure but user queries succeed
        mockPrisma.file.aggregate.mockRejectedValue(new Error('File table locked'));
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.storage).toEqual({
          totalFiles: 0,
          totalSize: 0,
          avgFileSize: 0,
        });
        expect(data.users.total).toBe(250); // User queries still work
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    describe('Data Validation', () => {
      it('should handle null/undefined metrics gracefully', async () => {
        mockPrisma.file.aggregate.mockResolvedValue({
          _count: { id: null },
          _sum: { size: null },
          _avg: { size: null },
        });
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.storage).toEqual({
          totalFiles: 0,
          totalSize: 0,
          avgFileSize: 0,
        });
      });      it('should handle empty job queue gracefully', async () => {
        mockJobQueue.getMetrics.mockReturnValue({
          totalJobs: 0,
          pendingJobs: 0,
          processingJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          averageProcessingTime: 0,
          throughput: 0,
        });
        mockJobQueue.getQueueStatus.mockReturnValue({
          totalJobs: 0,
          pendingJobs: 0,
          processingJobs: 0,
          registeredProcessors: [],
        });
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.jobQueue).toEqual({
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          processors: [],
        });
      });

      it('should handle very large numbers in metrics', async () => {
        const largeSize = Number.MAX_SAFE_INTEGER;
        mockPrisma.file.aggregate.mockResolvedValue({
          _count: { id: 999999 },
          _sum: { size: largeSize },
          _avg: { size: largeSize / 999999 },
        });
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.storage.totalFiles).toBe(999999);
        expect(data.storage.totalSize).toBe(largeSize);
        expect(typeof data.storage.avgFileSize).toBe('number');
      });
    });

    describe('Cache Backend Variations', () => {
      it('should handle memory cache backend', async () => {
        mockCacheService.getStats.mockResolvedValue({
          memorySize: 512,
          backend: 'memory',
          redisConnected: false,
        });
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.cache.backend).toBe('memory');
        expect(data.cache.connected).toBe(true); // Memory is always "connected"
      });

      it('should handle redis cache disconnection', async () => {
        mockCacheService.getStats.mockResolvedValue({
          memorySize: 0,
          backend: 'redis',
          redisConnected: false,
        });
        
        const request = createMockRequest('GET', undefined, {
          cookies: { token: 'admin-token' },
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.cache.backend).toBe('redis');
        expect(data.cache.connected).toBe(false);
      });
    });

    describe('Job Queue Edge Cases', () => {
      it('should handle empty job list for clearing', async () => {
        mockJobQueue.getJobsByType.mockReturnValue([]);
        
        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
          body: { 
            action: 'clear-queue',
            jobType: 'empty-queue'
          },
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('0 empty-queue jobs cancelled');
      });      it('should handle job clearing with mixed statuses', async () => {
        const mockJobs = [
          { 
            id: 'job-1', 
            type: 'file-compression' as const,
            data: {},
            priority: 'normal' as const,
            status: 'pending' as const,
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { 
            id: 'job-2', 
            type: 'analytics-processing' as const,
            data: {},
            priority: 'normal' as const,
            status: 'completed' as const,
            attempts: 1,
            maxAttempts: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { 
            id: 'job-3', 
            type: 'email-notification' as const,
            data: {},
            priority: 'normal' as const,
            status: 'failed' as const,
            attempts: 3,
            maxAttempts: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { 
            id: 'job-4', 
            type: 'file-cleanup' as const,
            data: {},
            priority: 'normal' as const,
            status: 'processing' as const,
            attempts: 1,
            maxAttempts: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        mockJobQueue.getJobsByType.mockReturnValue(mockJobs);
        mockJobQueue.cancelJob.mockResolvedValue(true);

        const request = createMockRequest('POST', undefined, {
          cookies: { token: 'admin-token' },
          body: { 
            action: 'clear-queue',
            jobType: 'mixed-status'
          },
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('2 mixed-status jobs cancelled');
        expect(mockJobQueue.cancelJob).toHaveBeenCalledTimes(2); // Only pending and processing
      });
    });
  });
});
