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
  
  // Auth routes that should redirect if already authenticated
  const authRoutes = ['/auth/login', '/auth/signup'];
  const token = request.cookies.get('auth-token')?.value;

  // Check if the current path is protected
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      // Redirect to login if no token
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    try {
      // Verify token
      const payload = await EdgeAuthService.verifyToken(token);
      if (!payload) {
        // Invalid token, redirect to login
        const response = NextResponse.redirect(new URL('/auth/login', request.url));
        response.cookies.delete('auth-token');
        return response;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // Token verification failed, redirect to login
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // Check if the current path is an auth route
  if (authRoutes.some(route => pathname.startsWith(route))) {
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
        response.cookies.delete('auth-token');        return response;
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
