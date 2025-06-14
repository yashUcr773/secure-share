import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';
import { ActivityHelpers } from '@/lib/activity-logger';

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
      10, 
      1 * 60 * 1000 // 15 minutes in milliseconds
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

    console.log('🔧 [LOGIN DEBUG] Login attempt for email:', email);

    // Attempt login using enhanced auth service
    const result = await AuthService.login(email, password);
    
    if (!result.success) {
      console.log('❌ [LOGIN DEBUG] Login failed:', result.error);
      return addSecurityHeaders(NextResponse.json(
        { error: result.error || 'Invalid email or password' },
        { status: 401 }
      ));
    }

    console.log('✅ [LOGIN DEBUG] Login successful, checking 2FA...');

    // Check for 2FA requirement after successful password verification
    const { UserService } = await import('@/lib/database');    const user = await UserService.getUserById(result.user!.id);
    
    if (user && (user as { twoFactorEnabled?: boolean }).twoFactorEnabled) {
      // Store temporary session for 2FA verification
      const tempSessionId = `2fa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store user data temporarily for 2FA completion (expires in 10 minutes)
      const tempData = {
        userId: user.id,
        email: user.email,
        name: user.name,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      };      // In a real implementation, store this in Redis or database
      // For now, we'll use a simple in-memory store with proper typing
      if (typeof global !== 'undefined') {        interface TempSessionData {
          userId: string;
          email: string;
          name: string | null;
          accessToken: string | undefined;
          refreshToken: string | undefined;
          expiresAt: number;
        }
        
        interface GlobalTempSessions {
          tempSessions?: Map<string, TempSessionData>;
        }
        
        const globalStore = global as unknown as GlobalTempSessions;
        globalStore.tempSessions = globalStore.tempSessions || new Map<string, TempSessionData>();
        globalStore.tempSessions.set(tempSessionId, tempData);
      }
      
      return addSecurityHeaders(NextResponse.json(
        { 
          requires2FA: true,
          tempSession: tempSessionId,
          message: 'Please provide your 2FA verification code'
        },
        { status: 200 }
      ));
    }

    console.log('✅ [LOGIN DEBUG] No 2FA required, setting cookies...');
    console.log('🔧 [LOGIN DEBUG] Access token length:', result.accessToken?.length || 0);
    console.log('🔧 [LOGIN DEBUG] Refresh token length:', result.refreshToken?.length || 0);

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

    console.log('✅ [LOGIN DEBUG] Cookies set successfully');

    // Log user login activity
    try {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      await ActivityHelpers.logUserLogin(
        result.user!.id,
        result.user!.email,
        clientIp,
        userAgent
      );
    } catch (activityError) {
      console.warn('Failed to log login activity:', activityError);
    }

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Login error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
