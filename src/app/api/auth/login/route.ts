import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
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
    // Apply rate limiting using database
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const identifier = `auth_login:${clientIp}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'login_attempt', 
      5, 
      15 * 60 * 1000 // 15 minutes in milliseconds
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
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

    const body = await request.json();
    
    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { email, password } = validation.data;

    // Attempt login using enhanced auth service
    const result = await AuthService.login(email, password);
    
    if (!result.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: result.error || 'Invalid email or password' },
        { status: 401 }
      ));
    }

    // Create response with user data (without sensitive information)
    const response = NextResponse.json(
      { 
        message: 'Login successful',
        user: { 
          id: result.user!.id, 
          email: result.user!.email,
          name: result.user!.name 
        }
      },
      { status: 200 }
    );

    // Set access token cookie (short-lived)
    response.cookies.set('auth-token', result.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    });

    // Set refresh token cookie (long-lived)
    response.cookies.set('refresh-token', result.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Login error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
