import { NextRequest, NextResponse } from 'next/server';
import { Folder } from '@/generated/prisma';
import { FolderService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { jobQueue } from '@/lib/job-queue';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// GET - Get user's folders
export async function GET(request: NextRequest) {
  try {
    // Extract IP address from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'folders',
      ip,
      30, // 30 requests
      900 // per 15 minutes
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '30');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      return addSecurityHeaders(response);
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
      ));    }
    
    // Try to get folders from cache
    const cacheKey = `folders:${userId}`;
    const cacheResult = await CacheService.get(cacheKey);
      if (cacheResult.hit && cacheResult.data) {
      const cachedFolders = cacheResult.data as Folder[];
      
      // Queue analytics job for cached view
      await jobQueue.addJob('analytics-processing', {
        type: 'folders_view',
        userId,
        ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        cached: true
      });

      const response = NextResponse.json({
        folders: cachedFolders,
        total: cachedFolders.length,
        cached: true,
      });

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '30');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      // Add CDN headers
      const cdnUrl = CDNService.getCDNUrl('/api/folders', {
        type: 'api',
        optimization: true
      });
      if (cdnUrl !== '/api/folders') {
        response.headers.set('X-CDN-URL', cdnUrl);
      }

      return addSecurityHeaders(response);
    }
    
    const folders = await FolderService.getUserFolders(userId);
    
    // Cache the folders for 3 minutes
    await CacheService.set(cacheKey, folders, 180);
    
    // Queue analytics job
    await jobQueue.addJob('analytics-processing', {
      type: 'folders_view',
      userId,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      cached: false
    });

    const responseData = {
      folders,
      total: folders.length,
    };

    const responseText = JSON.stringify(responseData);
    let response: NextResponse;

    // Apply compression for larger responses
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
      response = NextResponse.json(responseData);
    }    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    
    // Add CDN headers
    const cdnUrl = CDNService.getCDNUrl('/api/folders', {
      type: 'api',
      optimization: true
    });
    if (cdnUrl !== '/api/folders') {
      response.headers.set('X-CDN-URL', cdnUrl);
    }

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Folders fetch error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// POST - Create new folder
export async function POST(request: NextRequest) {
  try {
    // Extract IP address from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'folder_create',
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

    // Get user from authentication token
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
    const { name, parentId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      ));
    }    const folder = await FolderService.createFolder({
      name: name.trim(),
      parentId: parentId || null,
      userId,
    });
    
    // Invalidate folders cache
    const cacheKey = `folders:${userId}`;
    await CacheService.delete(cacheKey);
    
    // Queue analytics job for folder creation
    await jobQueue.addJob('analytics-processing', {
      type: 'folder_created',
      userId,
      folderId: folder.id,
      folderName: name.trim(),
      parentId: parentId || null,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    const response = NextResponse.json({
      folder,
      message: 'Folder created successfully',
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Folder creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
