import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FileStorage } from '@/lib/storage';
import { EdgeAuthService } from '@/lib/auth-edge';
import { generalRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
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
    const identifier = createRateLimitIdentifier(request, 'folders');
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

    // Authentication check
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    let userId = 'anonymous';
    try {
      const payload = await EdgeAuthService.verifyToken(token);
      if (payload) {
        userId = payload.userId;
      } else {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ));
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }
    
    const folders = await FileStorage.getUserFolders(userId);
    
    const response = NextResponse.json({
      folders,
      total: folders.length,
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

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
    const identifier = createRateLimitIdentifier(request, 'folder_create');
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

    // Get user from authentication token
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    const payload = await EdgeAuthService.verifyToken(token);
    if (!payload) {
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

    const folder = await FileStorage.createFolder({
      name: name.trim(),
      parentId: parentId || null,
      userId: payload.userId,
    });

    const response = NextResponse.json({
      folder,
      message: 'Folder created successfully',
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Folder creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
