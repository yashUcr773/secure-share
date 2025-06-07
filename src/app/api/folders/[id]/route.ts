import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FolderService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';
import { getClientIP } from '@/lib/rate-limit';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { jobQueue } from '@/lib/job-queue';

// Validation schema for folder updates
const updateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255, 'Folder name too long').optional(),
  parentId: z.string().nullable().optional(),
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Authentication and authorization helper
async function verifyFolderAccess(request: NextRequest, folderId: string): Promise<{ success: boolean; userId?: string; response?: NextResponse }> {
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
    const result = await AuthService.verifyToken(token);
    if (!result.valid || !result.user) {
      return {
        success: false,
        response: addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ))
      };
    }

    // Verify user owns this folder
    const folder = await FolderService.getFolder(folderId);
    if (!folder || folder.userId !== result.user.id) {
      return {
        success: false,
        response: addSecurityHeaders(NextResponse.json(
          { error: 'Folder not found or access denied' },
          { status: 404 }
        ))
      };
    }

    return { success: true, userId: result.user.id };
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

// GET - Get specific folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      getClientIP(request),
      'folder_get',
      100, // requests
      60 * 60 * 1000 // 1 hour window
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      return addSecurityHeaders(response);
    }

    const { id: folderId } = await params;
    const sanitizedFolderId = sanitizeInput(folderId);
      // Verify access
    const auth = await verifyFolderAccess(request, sanitizedFolderId);
    if (!auth.success) {
      return auth.response!;
    }

    // Try to get folder from cache
    const cacheKey = `folder:${sanitizedFolderId}:${auth.userId}`;
    const cacheResult = await CacheService.get(cacheKey);
    
    if (cacheResult.hit && cacheResult.data) {
      // Queue analytics job for cached view
      await jobQueue.addJob('analytics-processing', {
        type: 'folder_view',
        userId: auth.userId,
        folderId: sanitizedFolderId,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        cached: true
      });

      const response = NextResponse.json({ 
        folder: cacheResult.data,
        cached: true 
      });

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      // Add CDN headers
      const cdnUrl = CDNService.getCDNUrl(`/api/folders/${sanitizedFolderId}`, {
        type: 'api',
        optimization: true
      });
      if (cdnUrl !== `/api/folders/${sanitizedFolderId}`) {
        response.headers.set('X-CDN-URL', cdnUrl);
      }

      return addSecurityHeaders(response);
    }

    const folder = await FolderService.getFolder(sanitizedFolderId);
    
    if (!folder) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      ));
    }
    
    // Cache the folder for 5 minutes
    await CacheService.set(cacheKey, folder, 300);
    
    // Queue analytics job
    await jobQueue.addJob('analytics-processing', {
      type: 'folder_view',
      userId: auth.userId,
      folderId: sanitizedFolderId,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      cached: false
    });

    const responseData = { folder };
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
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    
    // Add CDN headers
    const cdnUrl = CDNService.getCDNUrl(`/api/folders/${sanitizedFolderId}`, {
      type: 'api',
      optimization: true
    });
    if (cdnUrl !== `/api/folders/${sanitizedFolderId}`) {
      response.headers.set('X-CDN-URL', cdnUrl);
    }

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Folder fetch error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// PUT - Update folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      getClientIP(request),
      'folder_update',
      50, // requests
      60 * 60 * 1000 // 1 hour window
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '50');
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

    const { id: folderId } = await params;
    const sanitizedFolderId = sanitizeInput(folderId);
    
    // Verify access
    const auth = await verifyFolderAccess(request, sanitizedFolderId);
    if (!auth.success) {
      return auth.response!;
    }

    const body = await request.json();
    
    // Validate input
    const validation = updateFolderSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { name, parentId } = validation.data;

    const updates: { name?: string, parentId?: string | null } = {};
    if (name !== undefined) {
      updates.name = sanitizeInput(name.trim());
    }
    if (parentId !== undefined) {
      updates.parentId = parentId ? sanitizeInput(parentId) : null;
    }

    const folder = await FolderService.updateFolder(sanitizedFolderId, updates);
    
    if (!folder) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      ));
    }

    const response = NextResponse.json({
      folder,
      message: 'Folder updated successfully',
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '50');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Folder update error:', error);
    const response = NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// DELETE - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      getClientIP(request),
      'folder_delete',
      30, // requests
      60 * 60 * 1000 // 1 hour window
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

    const { id: folderId } = await params;
    const sanitizedFolderId = sanitizeInput(folderId);
      // Verify access
    const auth = await verifyFolderAccess(request, sanitizedFolderId);
    if (!auth.success) {
      return auth.response!;
    }

    try {
      await FolderService.deleteFolder(sanitizedFolderId);
    } catch (error) {
      console.error('Folder deletion error:', error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Folder not found or could not be deleted' },
        { status: 404 }
      ));
    }

    const response = NextResponse.json({
      message: 'Folder deleted successfully',
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Folder deletion error:', error);
    const response = NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
