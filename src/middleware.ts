// Middleware for SecureShare
// Handles authentication, route protection, rate limiting, and security headers

import { NextRequest, NextResponse } from 'next/server';
import { EdgeAuthService } from '@/lib/auth-edge';
import { 
  generalRateLimit, 
  authRateLimit, 
  uploadRateLimit,
  checkRateLimit, 
  createRateLimitIdentifier 
} from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting first
  let rateLimitResult;
  
  if (pathname.startsWith('/api/auth/')) {
    // Stricter rate limiting for auth endpoints
    const identifier = createRateLimitIdentifier(request, 'auth');
    rateLimitResult = await checkRateLimit(request, authRateLimit, identifier);
  } else if (pathname.startsWith('/api/upload')) {
    // Rate limiting for upload endpoints
    const identifier = createRateLimitIdentifier(request, 'upload');
    rateLimitResult = await checkRateLimit(request, uploadRateLimit, identifier);
  } else if (pathname.startsWith('/api/')) {
    // General rate limiting for other API endpoints
    const identifier = createRateLimitIdentifier(request, 'api');
    rateLimitResult = await checkRateLimit(request, generalRateLimit, identifier);
  }

  // If rate limited, return 429 response
  if (rateLimitResult && !rateLimitResult.success) {
    const response = NextResponse.json(
      { error: 'Too many requests', message: 'Rate limit exceeded' },
      { status: 429 }
    );
    
    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/upload'];
  
  // All auth-related routes that don't need authentication checks
  const allAuthRoutes = ['/auth/login', '/auth/signup', '/auth/verify-email', '/auth/forgot-password', '/auth/reset-password'];
  
  const token = request.cookies.get('auth-token')?.value;
  
  console.log('🔧 [MIDDLEWARE DEBUG] Processing request for:', pathname);
  console.log('🔧 [MIDDLEWARE DEBUG] Token present:', !!token);

  // Check if the current path is protected
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    console.log('🔧 [MIDDLEWARE DEBUG] Accessing protected route:', pathname);
    
    if (!token) {
      console.log('❌ [MIDDLEWARE DEBUG] No token found, redirecting to login');
      // Redirect to login if no token, but avoid redirect loop
      if (pathname !== '/auth/login') {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    } else {
      console.log('🔧 [MIDDLEWARE DEBUG] Token found, verifying...');
      try {
        // Verify token
        const payload = await EdgeAuthService.verifyToken(token);
        if (!payload) {
          console.log('❌ [MIDDLEWARE DEBUG] Token verification failed - no payload');
          // Invalid token, redirect to login with expired flag only if not coming from login
          const referer = request.headers.get('referer');
          const isFromLogin = referer && referer.includes('/auth/login');
          
          console.log('🔧 [MIDDLEWARE DEBUG] Referer:', referer, 'isFromLogin:', isFromLogin);
          
          const redirectUrl = isFromLogin 
            ? new URL('/auth/login', request.url)
            : new URL('/auth/login?expired=true', request.url);
          
          const response = NextResponse.redirect(redirectUrl);
          response.cookies.delete('auth-token');
          response.cookies.delete('refresh-token');
          return response;
        }
        console.log('✅ [MIDDLEWARE DEBUG] Token verification successful for user:', payload.userId);
      } catch (error) {
        console.error('❌ [MIDDLEWARE DEBUG] Token verification failed:', error);
        // Token verification failed, redirect to login with expired flag only if not coming from login
        const referer = request.headers.get('referer');
        const isFromLogin = referer && referer.includes('/auth/login');
        
        const redirectUrl = isFromLogin 
          ? new URL('/auth/login', request.url)
          : new URL('/auth/login?expired=true', request.url);
        
        const response = NextResponse.redirect(redirectUrl);
        response.cookies.delete('auth-token');
        response.cookies.delete('refresh-token');
        return response;
      }
    }
  }
  // Check if the current path is an auth route that should redirect if authenticated
  if (allAuthRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      try {
        // Verify token
        const payload = await EdgeAuthService.verifyToken(token);
        if (payload) {
          // User is already authenticated, redirect to dashboard
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        // Token is invalid, clear it and continue
        const response = NextResponse.next();
        response.cookies.delete('auth-token');
        return response;
      }
    }
  }

  // Create response with security headers
  const response = NextResponse.next();
  
  // Add security headers
  addSecurityHeaders(response);
  
  // Add rate limit headers if rate limiting was applied
  if (rateLimitResult?.headers) {
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

// Add comprehensive security headers
function addSecurityHeaders(response: NextResponse) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Strict Transport Security (HSTS)
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' ${isProduction ? '' : "'unsafe-inline'"};
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s+/g, ' ').trim()
  );
  
  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // X-DNS-Prefetch-Control
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  // X-XSS-Protection (legacy, but still good to have)
  response.headers.set('X-XSS-Protection', '1; mode=block');
    // Remove server information
  response.headers.set('Server', '');
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
