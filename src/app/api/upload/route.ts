import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FileService, UserService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
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
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const identifier = `upload:${clientIp}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'upload_attempt', 
      10, 
      60 * 60 * 1000 // 10 uploads per hour
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Upload rate limit exceeded. Please try again later.' },
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

    // Authentication check - require login for uploads
    const token = request.cookies.get('auth-token')?.value;
    let userId: string | null = null;
    
    if (token) {
      try {
        const verificationResult = await AuthService.verifyToken(token);
        if (verificationResult.valid && verificationResult.user) {
          userId = verificationResult.user.id;
          
          // Validate CSRF token for authenticated uploads
          const csrfValid = await validateCSRFWithSession(request, userId);
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
    }    // Save file to database using FileService (shareId becomes the file ID)
    const file = await FileService.createFile({
      fileName: sanitizedFileName,
      fileSize,
      encryptedContent,
      salt,
      iv,
      key: isPasswordProtected ? undefined : (key || undefined), // Don't store key if password protected
      isPasswordProtected,
      userId: userId || undefined, // undefined for anonymous uploads
    });

    // Update the file with the custom shareId if provided
    if (shareId !== file.id) {
      // For now, use the generated ID. In a real implementation, you might want to
      // allow custom shareIds with proper validation to prevent conflicts
    }

    const response = NextResponse.json({
      success: true,
      shareId: file.id,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/share/${file.id}`,
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Upload error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
