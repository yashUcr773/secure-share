import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SharedLinkService, RateLimitService, FileService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { JobQueue } from '@/lib/job-queue';
import { ActivityHelpers } from '@/lib/activity-logger';

// Validation schema for shared link creation
const createSharedLinkSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  expiresAt: z.string().datetime().optional(),
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// GET /api/dashboard/shared - Get all shared links for the current user
export async function GET(request: NextRequest) {
  try {
    // Extract IP address properly for NextRequest
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'shared_links',
      ip,
      20, // 20 requests
      900 // per 15 minutes
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '20');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
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

    // Authentication check
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }    let userId: string;
    try {
      const verification = await AuthService.verifyToken(token);
      if (!verification.valid || !verification.user) {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ));
      }
      userId = verification.user.id;
    } catch (error) {
      console.error('Token verification failed:', error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    // Check cache first
    const cacheKey = `dashboard_shared:${userId}`;
    const cachedData = await CacheService.get(cacheKey);
    
    let sharedLinks;
    let isFromCache = false;
    if (cachedData && cachedData.data) {
      sharedLinks = cachedData.data;
      isFromCache = true;
    } else {
      // Get user's shared links from database
      sharedLinks = await SharedLinkService.getUserSharedLinks(userId);
      
      // Cache the result for 3 minutes (shorter than files as this changes more frequently)
      await CacheService.set(cacheKey, sharedLinks, 3 * 60);
    }

    // Prepare response data
    const responseData = {
      success: true,
      sharedLinks,
      cached: isFromCache,
      timestamp: new Date().toISOString()
    };

    // Compress response if it's large
    const responseText = JSON.stringify(responseData);
    let finalResponse;
    
    if (responseText.length > 1024) { // Compress if larger than 1KB
      try {
        const compressionResult = await CompressionService.compress(
          responseText, 
          { mimeType: 'application/json' }
        );
        
        const response = new NextResponse(compressionResult.compressed.toString(), { status: 200 });
        response.headers.set('Content-Type', 'application/json');
        response.headers.set('Content-Encoding', 'gzip');
        response.headers.set('X-Compression-Ratio', compressionResult.compressionRatio.toString());
        response.headers.set('X-Cache-Status', isFromCache ? 'HIT' : 'MISS');
        
        finalResponse = response;
      } catch (compressionError) {
        console.warn('Compression failed, serving uncompressed:', compressionError);
        finalResponse = NextResponse.json(responseData);
      }
    } else {
      finalResponse = NextResponse.json(responseData);
      finalResponse.headers.set('X-Cache-Status', isFromCache ? 'HIT' : 'MISS');
    }

    // Add rate limit headers
    finalResponse.headers.set('X-RateLimit-Limit', '20');
    finalResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    finalResponse.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    // Add CDN optimization headers
    const cdnUrl = CDNService.getCDNUrl('/api/dashboard/shared', { 
      type: 'api',
      optimization: true
    });
    if (cdnUrl) {
      finalResponse.headers.set('X-CDN-URL', cdnUrl);
    }

    // Queue analytics job (async)
    const jobQueue = JobQueue.getInstance();
    jobQueue.addJob('analytics-processing', {
      type: 'dashboard_shared_view',
      userId,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      sharedLinksCount: Array.isArray(sharedLinks) ? sharedLinks.length : 0
    }).catch(error => {
      console.warn('Failed to queue analytics job:', error);
    });

    return addSecurityHeaders(finalResponse);

  } catch (error) {
    console.error('Dashboard shared links error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// POST /api/dashboard/shared - Create a new shared link
export async function POST(request: NextRequest) {
  try {
    // Extract IP address properly for NextRequest
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'create_shared_link',
      ip,
      10, // 10 requests
      3600 // per hour
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '10');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
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

    // Authentication check
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    let userId: string;
    try {
      const verification = await AuthService.verifyToken(token);
      if (!verification.valid || !verification.user) {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ));
      }
      userId = verification.user.id;
    } catch (error) {
      console.error('Token verification failed:', error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const body = await request.json();
    
    // Validate input
    const validation = createSharedLinkSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { fileId, expiresAt } = validation.data;

    // Sanitize file ID
    const sanitizedFileId = sanitizeInput(fileId);    // Create shared link using database service
    const sharedLink = await SharedLinkService.createSharedLink({
      fileId: sanitizedFileId,
      userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    
    // Invalidate cache since we're adding a new shared link
    const cacheKey = `dashboard_shared:${userId}`;
    await CacheService.delete(cacheKey);
    
    const response = NextResponse.json({
      success: true,
      sharedLink,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());    // Queue analytics job (async)
    const jobQueue = JobQueue.getInstance();
    jobQueue.addJob('analytics-processing', {
      type: 'shared_link_created',
      userId,
      fileId: sanitizedFileId,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.warn('Failed to queue analytics job:', error);
    });

    // Log shared link creation activity
    try {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // Get file metadata for logging
      const fileMetadata = await FileService.getFileMetadata(sanitizedFileId);
      
      await ActivityHelpers.logSharedLinkCreated(
        userId,
        fileMetadata?.fileName || 'Unknown file',
        sanitizedFileId,
        ip,
        userAgent
      );
    } catch (activityError) {
      console.warn('Failed to log shared link creation activity:', activityError);
    }

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Create shared link error:', error);
    if (error instanceof Error && error.message.includes('File not found')) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      ));
    }
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// DELETE /api/dashboard/shared - Delete a shared link
export async function DELETE(request: NextRequest) {
  try {
    // Extract IP address properly for NextRequest
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'delete_shared_link',
      ip,
      20, // 20 requests
      900 // per 15 minutes
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '20');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
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

    // Authentication check
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    let userId: string;
    try {
      const verification = await AuthService.verifyToken(token);
      if (!verification.valid || !verification.user) {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ));
      }
      userId = verification.user.id;
    } catch (error) {
      console.error('Token verification failed:', error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      ));
    }

    // Sanitize file ID
    const sanitizedFileId = sanitizeInput(fileId);    // Verify user owns this shared link by checking their shared links
    const userSharedLinks = await SharedLinkService.getUserSharedLinks(userId);
    const linkExists = userSharedLinks.some(link => link.fileId === sanitizedFileId);
    
    if (!linkExists) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Shared link not found or access denied' },
        { status: 404 }
      ));
    }    // Delete shared link using database service
    try {
      await SharedLinkService.deleteSharedLink(sanitizedFileId);
    } catch {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Shared link not found' },
        { status: 404 }
      ));
    }

    // Invalidate cache since we're removing a shared link
    const cacheKey = `dashboard_shared:${userId}`;
    await CacheService.delete(cacheKey);

    const response = NextResponse.json({
      success: true,
      message: 'Shared link deleted successfully',
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());    // Queue analytics job (async)
    const jobQueue = JobQueue.getInstance();
    jobQueue.addJob('analytics-processing', {
      type: 'shared_link_deleted',
      userId,
      fileId: sanitizedFileId,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.warn('Failed to queue analytics job:', error);
    });

    // Log shared link deletion activity
    try {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // Get file metadata for logging
      const fileMetadata = await FileService.getFileMetadata(sanitizedFileId);
      
      await ActivityHelpers.logSharedLinkDeleted(
        userId,
        fileMetadata?.fileName || 'Unknown file',
        sanitizedFileId,
        ip,
        userAgent
      );
    } catch (activityError) {
      console.warn('Failed to log shared link deletion activity:', activityError);
    }

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Delete shared link error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
