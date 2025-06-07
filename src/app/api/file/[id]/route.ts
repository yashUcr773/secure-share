import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FileService, SharedLinkService, RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for file access
const fileAccessSchema = z.object({
  password: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'file_access',
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

    const { id: fileId } = await params;
    
    if (!fileId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      ));
    }

    // Sanitize file ID to prevent injection attacks
    const sanitizedFileId = sanitizeInput(fileId);

    const fileData = await FileService.getFileMetadata(sanitizedFileId);
    
    if (!fileData) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      ));
    }

    // Update view count for shared link analytics
    try {
      await SharedLinkService.updateAnalytics(sanitizedFileId, 'view');
    } catch (error) {
      // Analytics update failure shouldn't break file access
      console.warn('Failed to update analytics:', error);
    }

    // Return file metadata (without the actual encrypted content for security)
    const response = NextResponse.json({
      id: fileData.id,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      isPasswordProtected: fileData.isPasswordProtected,
      createdAt: fileData.createdAt,
      // Only return encryption parameters, not the content itself
      salt: fileData.salt,
      iv: fileData.iv,
      key: fileData.key, // Only present if not password protected
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('File metadata error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Separate endpoint to get the actual encrypted content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting for content access
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'file_download',
      request.ip || 'unknown',
      10, // 10 requests
      900 // per 15 minutes
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many download requests. Please try again later.' },
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

    const { id: fileId } = await params;
    
    if (!fileId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      ));
    }

    // Sanitize file ID
    const sanitizedFileId = sanitizeInput(fileId);

    const body = await request.json();
    
    // Validate input
    const validation = fileAccessSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { password } = validation.data;

    const fileData = await FileService.getFile(sanitizedFileId);
    
    if (!fileData) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      ));
    }

    // If password protected, validate password (in real app, you'd verify against hash)
    if (fileData.isPasswordProtected && !password) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Password required' },
        { status: 401 }
      ));
    }

    // Update download count for shared link analytics when content is accessed
    try {
      await SharedLinkService.updateAnalytics(sanitizedFileId, 'download');
    } catch (error) {
      // Analytics update failure shouldn't break file download
      console.warn('Failed to update download analytics:', error);
    }

    // Return the encrypted content for client-side decryption
    const response = NextResponse.json({
      encryptedContent: fileData.encryptedContent,
      salt: fileData.salt,
      iv: fileData.iv,
      key: fileData.key,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('File content error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
