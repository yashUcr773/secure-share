import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const identifier = `auth_me:${clientIp}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'me_request', 
      100, 
      60 * 1000 // 100 requests per minute
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

    const token = request.cookies.get('auth-token')?.value;
    
    console.log('🔧 [ME DEBUG] Checking authentication...');
    console.log('🔧 [ME DEBUG] Token present:', !!token);
    if (token) {
      console.log('🔧 [ME DEBUG] Token length:', token.length);
      console.log('🔧 [ME DEBUG] Token start:', token.substring(0, 20) + '...');
    }
    
    if (!token) {
      console.log('❌ [ME DEBUG] No token found in cookies');
      return addSecurityHeaders(NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ));
    }

    console.log('🔧 [ME DEBUG] Verifying token...');

    // Verify token using enhanced auth service
    const verificationResult = await AuthService.verifyToken(token);
    
    console.log('🔧 [ME DEBUG] Verification result:', {
      valid: verificationResult.valid,
      error: verificationResult.error,
      hasUser: !!verificationResult.user
    });
    
    if (!verificationResult.valid || !verificationResult.user) {
      console.log('❌ [ME DEBUG] Token verification failed:', verificationResult.error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    console.log('✅ [ME DEBUG] Token verification successful');

    const user = verificationResult.user;    const response = NextResponse.json({
      user: { 
        id: user.id, 
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Auth verification error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
