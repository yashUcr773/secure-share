// Admin monitoring dashboard API endpoint
// Provides real-time status of job queue, cache, and system health

import { NextRequest, NextResponse } from 'next/server';
import { appInitializer } from '@/lib/app-initializer';
import { jobQueue } from '@/lib/job-queue';
import { CacheService } from '@/lib/cache';
import { AuthService } from '@/lib/auth-enhanced';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  initialization: {
    status: any;
    healthy: boolean;
  };
  jobQueue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    processors: string[];
  };  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    backend: 'redis' | 'memory';
    connected: boolean;
  };
  database: {
    connections: number;
    activeQueries: number;
    health: 'healthy' | 'degraded' | 'down';
  };
  storage: {
    totalFiles: number;
    totalSize: number;
    avgFileSize: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
}

async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role === 'admin';
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

async function authenticateAdmin(request: NextRequest): Promise<{ success: boolean; userId?: string }> {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return { success: false };
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded.valid || !decoded.user) {
      return { success: false };
    }

    const isAdmin = await isAdminUser(decoded.user.id);
    if (!isAdmin) {
      return { success: false };
    }

    return { success: true, userId: decoded.user.id };
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false };
  }
}

async function getJobQueueMetrics() {
  try {
    const metrics = jobQueue.getMetrics();
    const status = jobQueue.getQueueStatus();
    return {
      pending: metrics.pendingJobs,
      processing: metrics.processingJobs,
      completed: metrics.completedJobs,
      failed: metrics.failedJobs,
      processors: status.registeredProcessors
    };
  } catch (error) {
    console.error('Failed to get job queue metrics:', error);
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      processors: []
    };
  }
}

async function getCacheMetrics() {
  try {
    const stats = await CacheService.getStats();
    return {
      hits: 0, // Cache service doesn't track hits/misses in current implementation
      misses: 0,
      hitRate: 0,
      size: stats.memorySize || 0,
      backend: stats.backend,
      connected: stats.redisConnected !== false
    };
  } catch (error) {
    console.error('Failed to get cache metrics:', error);
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      backend: 'memory' as const,
      connected: false
    };
  }
}

async function getDatabaseMetrics() {
  try {
    // Simple health check by counting users
    await prisma.user.count();
    
    return {
      connections: 1, // Prisma connection pooling
      activeQueries: 0,
      health: 'healthy' as const
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      connections: 0,
      activeQueries: 0,
      health: 'down' as const
    };
  }
}

async function getStorageMetrics() {
  try {
    const stats = await prisma.file.aggregate({
      _count: { id: true },
      _sum: { size: true },
      _avg: { size: true }
    });

    return {
      totalFiles: stats._count.id || 0,
      totalSize: Number(stats._sum.size) || 0,
      avgFileSize: Number(stats._avg.size) || 0
    };
  } catch (error) {
    console.error('Failed to get storage metrics:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      avgFileSize: 0
    };
  }
}

async function getUserMetrics() {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, active, newUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: last7Days
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: last24Hours
          }
        }
      })
    ]);

    return {
      total: total || 0,
      active: active || 0,
      new: newUsers || 0
    };
  } catch (error) {
    console.error('Failed to get user metrics:', error);
    return {
      total: 0,
      active: 0,
      new: 0
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const auth = await authenticateAdmin(request);
    
    if (!auth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Gather system metrics
    const [
      initStatus,
      jobQueueMetrics,
      cacheMetrics,
      databaseMetrics,
      storageMetrics,
      userMetrics
    ] = await Promise.all([
      appInitializer.getStatus(),
      getJobQueueMetrics(),
      getCacheMetrics(),
      getDatabaseMetrics(),
      getStorageMetrics(),
      getUserMetrics()
    ]);

    const startTime = initStatus.startTime.getTime();
    const uptime = Date.now() - startTime;

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      uptime,
      initialization: {
        status: initStatus,
        healthy: appInitializer.isHealthy()
      },
      jobQueue: jobQueueMetrics,
      cache: cacheMetrics,
      database: databaseMetrics,
      storage: storageMetrics,
      users: userMetrics
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Monitoring dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve system metrics' },
      { status: 500 }
    );
  }
}

// Manual job queue operations for admins
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    
    if (!auth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { action, jobType, data } = await request.json();

    switch (action) {
      case 'add-job':
        if (!jobType) {
          return NextResponse.json(
            { error: 'Job type required' },
            { status: 400 }
          );
        }
          const jobId = await jobQueue.addJob(jobType, data || {});
        return NextResponse.json({ success: true, jobId });      case 'clear-queue':
        if (!jobType) {
          return NextResponse.json(
            { error: 'Job type required for queue clearing' },
            { status: 400 }
          );
        }
        
        // Get all jobs of the specified type and cancel them
        const jobsToCancel = jobQueue.getJobsByType(jobType);
        let cancelledCount = 0;
        
        for (const job of jobsToCancel) {
          if (job.status === 'pending' || job.status === 'processing') {
            const cancelled = await jobQueue.cancelJob(job.id);
            if (cancelled) cancelledCount++;
          }
        }
        
        return NextResponse.json({ 
          success: true, 
          message: `${cancelledCount} ${jobType} jobs cancelled` 
        });

      case 'pause-queue':
        await jobQueue.pause();
        return NextResponse.json({ success: true, message: 'Job queue paused' });

      case 'resume-queue':
        await jobQueue.resume();
        return NextResponse.json({ success: true, message: 'Job queue resumed' });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Job queue operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform job queue operation' },
      { status: 500 }
    );
  }
}
