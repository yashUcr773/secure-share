import { NextRequest, NextResponse } from 'next/server';
import { FileService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { JobQueue } from '@/lib/job-queue';
import { ActivityHelpers } from '@/lib/activity-logger';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// GET /api/dashboard/files - Get all files for the current user
export async function GET(request: NextRequest) {
  try {
    // Extract IP address properly for NextRequest
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Apply rate limiting
    const identifier = `dashboard_files:${ip}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'files_request', 
      50, 
      60 * 1000 // 50 requests per minute
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
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

    // Verify token using enhanced auth service
    const verificationResult = await AuthService.verifyToken(token);
    
    if (!verificationResult.valid || !verificationResult.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const userId = verificationResult.user.id;
      // Check cache first
    const cacheKey = `dashboard_files:${userId}`;
    const cachedFiles = await CacheService.get(cacheKey);
    
    let files;
    let isFromCache = false;
    if (cachedFiles && cachedFiles.data) {
      files = cachedFiles.data;
      isFromCache = true;
    } else {
      // Get user's files from database
      files = await FileService.getUserFiles(userId);
      
      // Cache the result for 5 minutes
      await CacheService.set(cacheKey, files, 5 * 60);
    }
    
    // Prepare response data
    const responseData = {
      success: true,
      files,
      cached: isFromCache,
      timestamp: new Date().toISOString()
    };// Compress response if it's large
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
    }    // Add CDN optimization headers
    const cdnUrl = CDNService.getCDNUrl('/api/dashboard/files', { 
      type: 'api',
      optimization: true
    });
    if (cdnUrl) {
      finalResponse.headers.set('X-CDN-URL', cdnUrl);
    }

    // Queue analytics job (async)
    const jobQueue = JobQueue.getInstance();
    jobQueue.addJob('analytics-processing', {
      type: 'dashboard_files_view',
      userId,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      fileCount: Array.isArray(files) ? files.length : 0
    }).catch(error => {
      console.warn('Failed to queue analytics job:', error);
    });

    return addSecurityHeaders(finalResponse);

  } catch (error) {
    console.error('Dashboard files error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

// DELETE /api/dashboard/files - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const identifier = `dashboard_delete:${clientIp}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'delete_request', 
      10, 
      60 * 1000 // 10 deletes per minute
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      ));
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

    // Verify token using enhanced auth service
    const verificationResult = await AuthService.verifyToken(token);
    
    if (!verificationResult.valid || !verificationResult.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const userId = verificationResult.user.id;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      ));
    }

    // Get file to verify ownership
    const file = await FileService.getFileMetadata(fileId);
    
    if (!file || file.userId !== userId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      ));
    }    // Delete the file
    await FileService.deleteFile(fileId);
    
    // Log file deletion activity
    try {
      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      await ActivityHelpers.logFileDelete(
        userId,
        file.fileName || 'Unknown file',
        fileId,
        clientIp,
        userAgent
      );
    } catch (activityError) {
      console.warn('Failed to log file deletion activity:', activityError);
    }
    
    return addSecurityHeaders(NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    }));

  } catch (error) {
    console.error('Delete file error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
