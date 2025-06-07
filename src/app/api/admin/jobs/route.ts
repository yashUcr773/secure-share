/**
 * Job Queue Management API
 * Provides endpoints for monitoring and managing background jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { EdgeAuthService } from '@/lib/auth-edge';
import { jobQueue, JobQueueHelpers } from '@/lib/job-queue';
import { rateLimitHandler } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimitHandler(request, 'api', 30, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    // Verify authentication and admin privileges
    const authResult = await EdgeAuthService.verifyToken(request);
    if (!authResult.success || !authResult.payload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!EdgeAuthService.isAdmin(authResult.payload)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const jobId = url.searchParams.get('jobId');
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');

    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          status: jobQueue.getQueueStatus(),
          metrics: jobQueue.getMetrics(),
        });

      case 'job':
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required' },
            { status: 400 }
          );
        }
        const job = jobQueue.getJob(jobId);
        if (!job) {
          return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          job,
        });

      case 'jobs':
        let jobs;
        if (status) {
          jobs = jobQueue.getJobsByStatus(status as any);
        } else if (type) {
          jobs = jobQueue.getJobsByType(type as any);
        } else {
          // Get recent jobs (last 100)
          const allJobs = Array.from((jobQueue as any).jobs.values());
          jobs = allJobs
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 100);
        }
        return NextResponse.json({
          success: true,
          jobs,
          count: jobs.length,
        });

      default:
        return NextResponse.json({
          success: true,
          status: jobQueue.getQueueStatus(),
          metrics: jobQueue.getMetrics(),
        });
    }

  } catch (error) {
    console.error('Job queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimitHandler(request, 'api', 10, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    // Verify authentication and admin privileges
    const authResult = await EdgeAuthService.verifyToken(request);
    if (!authResult.success || !authResult.payload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!EdgeAuthService.isAdmin(authResult.payload)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, jobType, jobData, priority, delay } = body;

    switch (action) {
      case 'add':
        if (!jobType) {
          return NextResponse.json(
            { error: 'Job type required' },
            { status: 400 }
          );
        }

        const jobId = await jobQueue.addJob(jobType, jobData || {}, {
          priority: priority || 'normal',
          delay: delay || 0,
        });

        return NextResponse.json({
          success: true,
          jobId,
          message: 'Job added successfully',
        });

      case 'cleanup':
        await JobQueueHelpers.addCleanupJob(body.daysOld || 30, 'high');
        return NextResponse.json({
          success: true,
          message: 'Cleanup job added',
        });

      case 'cache-warmup':
        const cacheKeys = body.cacheKeys || ['analytics:global', 'user:stats'];
        await JobQueueHelpers.addCacheWarmupJob(cacheKeys, 'normal');
        return NextResponse.json({
          success: true,
          message: 'Cache warmup job added',
        });

      case 'maintenance':
        const tasks = body.tasks || ['cleanup', 'optimize'];
        await JobQueueHelpers.addDatabaseMaintenanceJob(tasks, 'low');
        return NextResponse.json({
          success: true,
          message: 'Maintenance job added',
        });

      case 'compress':
        const { fileId, fileName } = body;
        if (!fileId || !fileName) {
          return NextResponse.json(
            { error: 'File ID and name required' },
            { status: 400 }
          );
        }
        const compressionJobId = await JobQueueHelpers.addFileCompressionJob(
          fileId,
          fileName,
          'normal'
        );
        return NextResponse.json({
          success: true,
          jobId: compressionJobId,
          message: 'File compression job added',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Job queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimitHandler(request, 'api', 10, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    // Verify authentication and admin privileges
    const authResult = await EdgeAuthService.verifyToken(request);
    if (!authResult.success || !authResult.payload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!EdgeAuthService.isAdmin(authResult.payload)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const action = url.searchParams.get('action');

    if (action === 'cleanup') {
      // Clean up completed and failed jobs
      const cleaned = jobQueue.cleanup();
      return NextResponse.json({
        success: true,
        cleaned,
        message: `Cleaned up ${cleaned} old jobs`,
      });
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    const cancelled = await jobQueue.cancelJob(jobId);
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or cannot be cancelled' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    });

  } catch (error) {
    console.error('Job queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
