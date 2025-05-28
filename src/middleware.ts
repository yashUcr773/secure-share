import { NextRequest, NextResponse } from 'next/server';
import { EdgeAuthService } from '@/lib/auth-edge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
        response.cookies.delete('auth-token');
        return response;
      }
    }
  }

  return NextResponse.next();
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
