import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for signup
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for signup
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const identifier = `auth_signup:${clientIp}`;
    
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'signup_attempt', 
      3, 
      60 * 60 * 1000 // 3 attempts per hour
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
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
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { email, password } = validation.data;

    // Sanitize email input
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());    // Create user account
    const result = await AuthService.register(sanitizedEmail, password);
    
    if (!result.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: result.error },
        { status: 400 }
      ));
    }

    // Send verification email for new user
    if (result.user) {
      try {
        await AuthService.initiateEmailVerification(result.user.id);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't fail the signup if email sending fails
      }
    }

    const response = NextResponse.json(
      { 
        message: 'Account created successfully! Please check your email for verification instructions.',
        user: { 
          id: result.user!.id, 
          email: result.user!.email,
          name: result.user!.name 
        },
        requiresVerification: true
      },
      { status: 201 }
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Signup error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
