import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FolderService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for folder creation
const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255, 'Folder name too long'),
  parentId: z.string().nullable().optional(),
});

// GET - Get user's folders
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'folders',
      request.ip || 'unknown',
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
      ));
    }
    
    const folders = await FolderService.getUserFolders(userId);
    
    const response = NextResponse.json({
      folders,
      total: folders.length,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

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
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'folder_create',
      request.ip || 'unknown',
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
    }

    const folder = await FolderService.createFolder({
      name: name.trim(),
      parentId: parentId || null,
      userId,
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
