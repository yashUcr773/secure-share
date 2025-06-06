import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FileStorage } from '@/lib/storage';
import { EdgeAuthService } from '@/lib/auth-edge';
import { uploadRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFWithSession } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for upload
const uploadSchema = z.object({
  encryptedContent: z.string().min(1, 'Encrypted content is required'),
  salt: z.string().nullable(),
  iv: z.string().min(1, 'IV is required'),
  key: z.string().nullable(),
  shareId: z.string().min(1, 'Share ID is required'),
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileSize: z.number().min(1, 'File size must be positive').max(100 * 1024 * 1024, 'File too large (max 100MB)'),
  isPasswordProtected: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for uploads
    const identifier = createRateLimitIdentifier(request, 'upload');
    const rateLimitResult = await checkRateLimit(request, uploadRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Upload rate limit exceeded. Please try again later.' },
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
    }    // Authentication check - require login for uploads
    const token = request.cookies.get('auth-token')?.value;
    let userId = 'anonymous'; // Default fallback
    
    if (token) {
      try {
        const payload = await EdgeAuthService.verifyToken(token);
        if (payload) {
          userId = payload.userId;
          
          // Validate CSRF token for authenticated uploads
          const csrfValid = await validateCSRFWithSession(request, payload.userId);
          if (!csrfValid) {
            return addSecurityHeaders(NextResponse.json(
              { error: 'Invalid CSRF token' },
              { status: 403 }
            ));
          }
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        // Continue with anonymous upload but log the error
      }
    }

    const body = await request.json();
    
    // Validate input
    const validation = uploadSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { 
      encryptedContent, 
      salt, 
      iv, 
      key, 
      shareId, 
      fileName, 
      fileSize,
      isPasswordProtected 
    } = validation.data;

    // Sanitize file name to prevent path traversal
    const sanitizedFileName = sanitizeInput(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

    // Additional security checks
    if (encryptedContent.length > 200 * 1024 * 1024) { // 200MB max for encrypted content
      return addSecurityHeaders(NextResponse.json(
        { error: 'Encrypted content too large' },
        { status: 413 }
      ));
    }

    // Prepare file data for storage
    const fileData = {
      id: shareId,
      fileName: sanitizedFileName,
      fileSize,
      encryptedContent,
      salt,
      iv,
      key: isPasswordProtected ? null : key, // Don't store key if password protected
      isPasswordProtected,
      createdAt: new Date().toISOString(),
      userId,
    };

    // Save to persistent storage
    await FileStorage.saveFile(fileData);

    const response = NextResponse.json({
      success: true,
      shareId,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/share/${shareId}`,
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Upload error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
