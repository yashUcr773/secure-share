import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { authRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'auth_login');
    const rateLimitResult = await checkRateLimit(request, authRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
      
      // Add rate limit headers
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

    const body = await request.json();
    
    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }    const { email, password } = validation.data;

    // Get user first to check account lockout
    const user = await AuthService.getUserByEmail(email);
    if (user && !user.isActive) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Account is disabled' },
        { status: 401 }
      ));
    }

    // Check account lockout
    if (user && await AuthService.checkAccountLockout(user)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' },
        { status: 423 }
      ));
    }

    // Authenticate user
    const result = await AuthService.login(email, password);
    
    if (!result.success) {
      // Record failed login attempt if user exists
      if (user) {
        await AuthService.recordFailedLoginAttempt(user);
      }
      
      return addSecurityHeaders(NextResponse.json(
        { error: result.error },
        { status: 401 }
      ));
    }

    // Clear any previous failed login attempts
    if (user) {
      await AuthService.clearLoginAttempts(user);
    }

    // Generate token pair for session management
    const tokenPair = await AuthService.generateTokenPair(result.user!);

    // Create response with token
    const response = NextResponse.json(
      { 
        message: 'Login successful',
        user: { id: result.user!.id, email: result.user!.email }
      },
      { status: 200 }
    );

    // Set access token cookie (short-lived)
    response.cookies.set('auth-token', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    });

    // Set refresh token cookie (long-lived)
    response.cookies.set('refresh-token', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Login error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
