// Token refresh endpoint for SecureShare
// Handles access token refresh using refresh tokens

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { addSecurityHeaders, validateOrigin } from '@/lib/security';
import { checkRateLimit, createRateLimitIdentifier } from '@/lib/rate-limit';

// Rate limiting for token refresh
const refreshRateLimit = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 refresh attempts per window
  message: 'Too many token refresh requests'
};

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'token_refresh');
    const rateLimitResult = await checkRateLimit(request, refreshRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many token refresh requests. Please try again later.' },
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

    // Get refresh token from cookies
    const refreshToken = request.cookies.get('refresh-token')?.value;
    
    if (!refreshToken) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      ));
    }

    // Refresh the access token
    const result = await AuthService.refreshToken(refreshToken);
    
    if (!result.success) {
      // Clear refresh token cookie if refresh failed
      const response = NextResponse.json(
        { error: result.error || 'Token refresh failed' },
        { status: 401 }
      );
      
      response.cookies.set('refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0 // Expire immediately
      });
      
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0 // Expire immediately
      });
      
      return addSecurityHeaders(response);
    }

    // Create response with new access token
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Token refreshed successfully'
      },
      { status: 200 }
    );

    // Set new access token cookie
    response.cookies.set('auth-token', result.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes (matching token expiry)
      path: '/'
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear tokens on error
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    
    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });
    
    return addSecurityHeaders(response);
  }
}
