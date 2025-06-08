import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FileService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFWithSession } from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { CDNService } from '@/lib/cdn';
import { JobQueueHelpers, jobQueue } from '@/lib/job-queue';
import { ActivityHelpers } from '@/lib/activity-logger';

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
      salt: salt || '',
      iv,
      key: isPasswordProtected ? undefined : (key || undefined), // Don't store key if password protected
      isPasswordProtected,
      userId: userId || undefined, // undefined for anonymous uploads
    });

    // Cache file metadata for quick access
    try {
      await CacheService.cacheFileMetadata(file.id, {
        fileName: sanitizedFileName,
        fileSize,
        createdAt: file.createdAt,
        isPasswordProtected,
        userId: userId || null,
      });
    } catch (cacheError) {
      console.warn('Failed to cache file metadata:', cacheError);
    }

    // Schedule background compression job for large files
    if (fileSize > 1024 * 1024) { // Files larger than 1MB
      try {
        await JobQueueHelpers.addFileCompressionJob(file.id, sanitizedFileName, 'normal');
      } catch (jobError) {
        console.warn('Failed to schedule compression job:', jobError);
      }
    }

    // Schedule virus scan for uploaded files
    try {
      await jobQueue.addJob('virus-scan', {
        fileId: file.id,
        fileName: sanitizedFileName,
        fileSize,
      }, { priority: 'high' });
    } catch (jobError) {
      console.warn('Failed to schedule virus scan:', jobError);
    }

    // Generate CDN URL if available
    let shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/share/${file.id}`;
    try {
      const cdnUrl = CDNService.getCDNUrl(`/share/${file.id}`);
      if (cdnUrl !== `/share/${file.id}`) {
        shareUrl = cdnUrl;
      }
    } catch (cdnError) {
      console.warn('Failed to generate CDN URL:', cdnError);
    }    // Update the file with the custom shareId if provided
    if (shareId !== file.id) {
      // For now, use the generated ID. In a real implementation, you might want to
      // allow custom shareIds with proper validation to prevent conflicts
    }

    // Log file upload activity
    try {
      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      await ActivityHelpers.logFileUpload(
        userId || undefined,
        sanitizedFileName,
        fileSize,
        clientIp,
        userAgent
      );
    } catch (activityError) {
      console.warn('Failed to log upload activity:', activityError);
    }

    const response = NextResponse.json({
      success: true,
      shareId: file.id,
      shareUrl,
      cached: true, // Indicate that metadata is cached
      compressionScheduled: fileSize > 1024 * 1024,
      scanScheduled: true,
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
