import { NextRequest, NextResponse } from 'next/server';
import { FileService, RateLimitService } from '@/lib/database';
import { AuthService } from '@/lib/auth-enhanced';
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
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const identifier = `dashboard_files:${clientIp}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'files_request', 
      50, 
      60 * 1000 // 50 requests per minute
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
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

    // Verify token using enhanced auth service
    const verificationResult = await AuthService.verifyToken(token);
    
    if (!verificationResult.valid || !verificationResult.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const userId = verificationResult.user.id;
    
    // Get user's files from database
    const files = await FileService.getUserFiles(userId);
    
    return addSecurityHeaders(NextResponse.json({
      success: true,
      files,
    }));

  } catch (error) {
    console.error('Dashboard files error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

// DELETE /api/dashboard/files - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const identifier = `dashboard_delete:${clientIp}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'delete_request', 
      10, 
      60 * 1000 // 10 deletes per minute
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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

    // Authentication check
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    // Verify token using enhanced auth service
    const verificationResult = await AuthService.verifyToken(token);
    
    if (!verificationResult.valid || !verificationResult.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const userId = verificationResult.user.id;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      ));
    }

    // Get file to verify ownership
    const file = await FileService.getFileMetadata(fileId);
    
    if (!file || file.userId !== userId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      ));
    }

    // Delete the file
    await FileService.deleteFile(fileId);
    
    return addSecurityHeaders(NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    }));

  } catch (error) {
    console.error('Delete file error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
