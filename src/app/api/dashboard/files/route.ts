import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';
import { EdgeAuthService } from '@/lib/auth-edge';
import { generalRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// GET /api/dashboard/files - Get all files for the current user
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'dashboard');
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
    
    const files = await FileStorage.getUserFiles(userId);
    
    const response = NextResponse.json({
      success: true,
      files,
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Dashboard files error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// DELETE /api/dashboard/files - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'dashboard_delete');
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

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
      if (!fileId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      ));
    }    // Verify user owns this file before deletion
    const ownsFile = await FileStorage.verifyFileOwnership(fileId, userId);
    if (!ownsFile) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      ));
    }

    const deleted = await FileStorage.deleteFile(fileId);
    
    if (!deleted) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      ));
    }

    const response = NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Delete file error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
