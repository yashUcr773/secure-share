import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FileStorage } from '@/lib/storage';
import { EdgeAuthService } from '@/lib/auth-edge';
import { generalRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { jobQueue } from '@/lib/job-queue';

// Validation schema for maintenance actions
const maintenanceSchema = z.object({
  action: z.enum(['cleanup']),
  daysOld: z.number().min(1).max(365).optional(),
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Admin authentication check
async function verifyAdminAccess(request: NextRequest): Promise<{ success: boolean; userId?: string; response?: NextResponse }> {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return {
      success: false,
      response: addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ))
    };
  }

  try {
    const payload = await EdgeAuthService.verifyToken(token);
    if (!payload) {
      return {
        success: false,
        response: addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ))
      };
    }    // Check if user has admin privileges
    if (!EdgeAuthService.isAdmin(payload)) {
      return {
        success: false,
        response: addSecurityHeaders(NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        ))
      };
    }
    
    return { success: true, userId: payload.userId };
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      success: false,
      response: addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ))
    };
  }
}

// GET /api/admin/storage - Get storage statistics
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'admin_storage');
    const rateLimitResult = await checkRateLimit(request, generalRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
    }

    // Validate request origin (CSRF protection)
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    ];
    
    if (!validateOrigin(request, allowedOrigins)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      ));
    }    // Admin authentication
    const auth = await verifyAdminAccess(request);
    if (!auth.success) {
      return auth.response!;
    }

    // Try to get storage stats from cache
    const cacheKey = `admin_storage_stats:${auth.userId}`;
    const cachedStats = await CacheService.get(cacheKey);
    
    if (cachedStats) {
      // Queue analytics job for cached view
      await jobQueue.addJob('analytics-processing', {
        type: 'admin_storage_view',
        userId: auth.userId,
        ip: createRateLimitIdentifier(request, 'admin_storage').split(':')[0],
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        cached: true
      });

      const response = NextResponse.json({
        success: true,
        stats: cachedStats,
        cached: true,
      });

      // Add rate limit headers
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Add CDN headers
      const cdnUrl = CDNService.getCDNUrl('/api/admin/storage', {
        type: 'api',
        optimization: true
      });
      if (cdnUrl !== '/api/admin/storage') {
        response.headers.set('X-CDN-URL', cdnUrl);
      }

      return addSecurityHeaders(response);
    }

    const stats = await FileStorage.getStats();
    
    // Cache the stats for 2 minutes
    await CacheService.set(cacheKey, stats, 120);
    
    // Queue analytics job
    await jobQueue.addJob('analytics-processing', {
      type: 'admin_storage_view',
      userId: auth.userId,
      ip: createRateLimitIdentifier(request, 'admin_storage').split(':')[0],
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      cached: false
    });

    const responseData = {
      success: true,
      stats,
    };

    const responseText = JSON.stringify(responseData);
    let response: NextResponse;    // Apply compression for larger responses
    if (responseText.length > 1024) {
      const compressionResult = await CompressionService.compress(responseText, {
        mimeType: 'application/json'
      });
      
      if (compressionResult.compressed && compressionResult.data) {
        response = new NextResponse(compressionResult.data, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Encoding': compressionResult.algorithm === 'gzip' ? 'gzip' : 'identity',
            'Content-Length': compressionResult.compressedSize.toString(),
          },
        });
      } else {
        response = NextResponse.json(responseData);
      }
    } else {
      response = NextResponse.json(responseData);    }

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Add CDN headers
    const cdnUrl = CDNService.getCDNUrl('/api/admin/storage', {
      type: 'api',
      optimization: true
    });
    if (cdnUrl !== '/api/admin/storage') {
      response.headers.set('X-CDN-URL', cdnUrl);
    }

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Storage stats error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// POST /api/admin/storage - Run maintenance tasks
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'admin_maintenance');
    const rateLimitResult = await checkRateLimit(request, generalRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
    }

    // Validate request origin (CSRF protection)
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    ];
    
    if (!validateOrigin(request, allowedOrigins)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      ));
    }

    // Admin authentication
    const auth = await verifyAdminAccess(request);
    if (!auth.success) {
      return auth.response!;
    }

    const body = await request.json();
    
    // Validate input
    const validation = maintenanceSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { action, daysOld } = validation.data;    if (action === 'cleanup') {
      const deletedCount = await FileStorage.cleanupOldFiles(daysOld || 30);
      
      // Queue analytics job for maintenance action
      await jobQueue.addJob('analytics-processing', {
        type: 'admin_storage_maintenance',
        userId: auth.userId,
        action: 'cleanup',
        deletedCount,
        daysOld: daysOld || 30,
        ip: createRateLimitIdentifier(request, 'admin_maintenance').split(':')[0],
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      const response = NextResponse.json({
        success: true,
        message: `Cleanup completed: ${deletedCount} files deleted`,
        deletedCount,
      });

      // Add rate limit headers
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return addSecurityHeaders(response);
    }

    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    ));

  } catch (error) {
    console.error('Storage maintenance error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
