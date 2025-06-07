import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FileService, SharedLinkService, RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';
import { CacheService } from '@/lib/cache';
import { CompressionService } from '@/lib/compression';
import { CDNService } from '@/lib/cdn';
import { JobQueue } from '@/lib/job-queue';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for file access
const fileAccessSchema = z.object({
  password: z.string().optional(),
});

// Extended response type for file downloads
interface FileDownloadResponse {
  encryptedContent: string;
  salt: string;
  iv: string;
  key: string | null;
  isCompressed?: boolean;
  compressionRatio?: number;
  cdnUrl?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting - get IP from headers as NextRequest doesn't have .ip
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'file_access',
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

    const { id: fileId } = await params;
    
    if (!fileId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      ));
    }    // Sanitize file ID to prevent injection attacks
    const sanitizedFileId = sanitizeInput(fileId);

    // Try to get cached file metadata first
    const cacheKey = `file:metadata:${sanitizedFileId}`;
    const cachedData = await CacheService.get(cacheKey);
    
    if (cachedData.hit && cachedData.data) {
      console.log('Cache hit for file metadata:', sanitizedFileId);
      
      // Update view count for analytics (async, don't wait)
      SharedLinkService.updateAnalytics(sanitizedFileId, 'view').catch(error => {
        console.warn('Failed to update analytics:', error);
      });

      const response = NextResponse.json(cachedData.data);
      
      // Add cache headers
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('Cache-Control', 'public, max-age=1800'); // 30 minutes
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '30');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      return addSecurityHeaders(response);
    }

    const fileData = await FileService.getFileMetadata(sanitizedFileId);
    
    if (!fileData) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      ));
    }    // Update view count for shared link analytics
    try {
      await SharedLinkService.updateAnalytics(sanitizedFileId, 'view');
    } catch (error) {
      // Analytics update failure shouldn't break file access
      console.warn('Failed to update analytics:', error);
    }

    // Prepare response data
    const responseData = {
      id: fileData.id,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      isPasswordProtected: fileData.isPasswordProtected,
      createdAt: fileData.createdAt,
      // Only return encryption parameters, not the content itself
      salt: fileData.salt,
      iv: fileData.iv,
      key: fileData.key, // Only present if not password protected
    };

    // Cache the metadata for future requests
    await CacheService.set(cacheKey, responseData, 1800); // Cache for 30 minutes

    // Return file metadata (without the actual encrypted content for security)
    const response = NextResponse.json(responseData);

    // Add cache headers
    response.headers.set('X-Cache', 'MISS');

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
) {  try {
    // Apply rate limiting for content access - get IP from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'file_download',
      ip,
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
    }    // Sanitize file ID
    const sanitizedFileId = sanitizeInput(fileId);    // Try to get cached file content first
    const contentCacheKey = `file:content:${sanitizedFileId}`;
    const cachedContent = await CacheService.get(contentCacheKey);
    
    if (cachedContent.hit && cachedContent.data) {
      console.log('Cache hit for file content:', sanitizedFileId);
      
      // Update download count for analytics (async, don't wait)
      SharedLinkService.updateAnalytics(sanitizedFileId, 'download').catch(error => {
        console.warn('Failed to update download analytics:', error);
      });

      const response = NextResponse.json(cachedContent.data);
      
      // Add cache headers
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('Cache-Control', 'private, max-age=900'); // 15 minutes for content
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '10');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      return addSecurityHeaders(response);
    }

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
    }    // Update download count for shared link analytics when content is accessed
    try {
      await SharedLinkService.updateAnalytics(sanitizedFileId, 'download');
    } catch (error) {
      // Analytics update failure shouldn't break file download
      console.warn('Failed to update download analytics:', error);
    }

    // Check if request accepts compression
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    const supportsGzip = acceptEncoding.includes('gzip');
      // Prepare response data with extended type
    let responseData: FileDownloadResponse = {
      encryptedContent: fileData.encryptedContent,
      salt: fileData.salt,
      iv: fileData.iv,
      key: fileData.key,
    };

    // Apply compression if supported and beneficial
    if (supportsGzip && fileData.encryptedContent) {
      try {
        const compressionResult = await CompressionService.compress(
          fileData.encryptedContent,
          { mimeType: 'application/octet-stream' }
        );
        
        if (compressionResult.compressed) {
          responseData = {
            ...responseData,
            encryptedContent: compressionResult.data.toString('base64'), // Convert buffer to string
            isCompressed: true,
            compressionRatio: compressionResult.compressionRatio
          };
        }
      } catch (error) {
        console.warn('Compression failed, serving uncompressed:', error);
      }
    }

    // Cache the file content for faster subsequent access
    await CacheService.set(contentCacheKey, responseData, 900); // Cache for 15 minutes    // Generate CDN URL if available (for static assets/thumbnails)
    if (fileData.fileName && fileData.fileName.match(/\.(jpg|jpeg|png|gif|pdf|txt)$/i)) {
      try {
        const cdnUrl = CDNService.getCDNUrl(`/files/${sanitizedFileId}`, { 
          type: 'sharedFiles',
          optimization: true 
        });
        if (cdnUrl) {
          responseData.cdnUrl = cdnUrl;
        }
      } catch (error) {
        console.warn('CDN URL generation failed:', error);
      }
    }

    // Schedule background job for analytics processing using getInstance
    try {
      const jobQueue = JobQueue.getInstance();
      await jobQueue.addJob('analytics-processing', {
        type: 'file_download',
        fileId: sanitizedFileId,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'unknown',
        compressed: !!responseData.isCompressed
      });
    } catch (error) {
      console.warn('Failed to queue analytics job:', error);
    }

    // Return the encrypted content for client-side decryption
    const response = NextResponse.json(responseData);

    // Add optimization headers
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('Cache-Control', 'private, max-age=900'); // 15 minutes
    
    if (responseData.isCompressed) {
      response.headers.set('Content-Encoding', 'gzip');
      response.headers.set('X-Compression-Ratio', responseData.compressionRatio?.toString() || '1');
    }
    
    if (responseData.cdnUrl) {
      response.headers.set('X-CDN-URL', responseData.cdnUrl);
    }

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
