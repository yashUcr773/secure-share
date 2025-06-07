import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SharedLinkService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';

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
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'shared_links',
      request.ip || 'unknown',
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
    }

    const sharedLinks = await SharedLinkService.getUserSharedLinks(userId);
    
    const response = NextResponse.json({
      success: true,
      sharedLinks,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return addSecurityHeaders(response);

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
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'create_shared_link',
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
    const sanitizedFileId = sanitizeInput(fileId);

    // Create shared link using database service
    const sharedLink = await SharedLinkService.createSharedLink({
      fileId: sanitizedFileId,
      userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    
    const response = NextResponse.json({
      success: true,
      sharedLink,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

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
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'delete_shared_link',
      request.ip || 'unknown',
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
    const sanitizedFileId = sanitizeInput(fileId);

    // Verify user owns this shared link by checking their shared links
    const userSharedLinks = await SharedLinkService.getUserSharedLinks(userId);
    const linkExists = userSharedLinks.some((link: any) => link.fileId === sanitizedFileId);
    
    if (!linkExists) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Shared link not found or access denied' },
        { status: 404 }
      ));
    }

    // Delete shared link using database service
    try {
      await SharedLinkService.deleteSharedLink(sanitizedFileId);
    } catch (error) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Shared link not found' },
        { status: 404 }
      ));
    }

    const response = NextResponse.json({
      success: true,
      message: 'Shared link deleted successfully',
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

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
