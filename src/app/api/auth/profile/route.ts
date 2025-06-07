import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { authRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFWithSession } from '@/lib/security';

// Validation schema for profile update
const profileUpdateSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'auth_profile');
    const rateLimitResult = await checkRateLimit(request, authRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many profile update attempts. Please try again later.' },
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

    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ));
    }    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    // Validate CSRF token
    const csrfValid = await validateCSRFWithSession(request, payload.userId);
    if (!csrfValid) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      ));
    }

    const body = await request.json();
    
    // Validate input
    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { email } = validation.data;

    // Sanitize email input
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

    // Get current user
    const user = await AuthService.getUserById(payload.userId);
    
    if (!user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      ));
    }

    // Check if email is already in use by another user (if changed)
    if (sanitizedEmail !== user.email.toLowerCase()) {
      const existingUser = await AuthService.getUserByEmail(sanitizedEmail);
      if (existingUser && existingUser.id !== user.id) {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        ));
      }
    }    // Update user profile in storage
    try {
      const updateResult = await AuthService.updateUser(payload.userId, {
        email: sanitizedEmail,
        updatedAt: new Date().toISOString()
      });

      if (!updateResult.success) {
        const response = NextResponse.json(
          { error: updateResult.error || 'Failed to update profile' },
          { status: 500 }
        );
        return addSecurityHeaders(response);
      }

    } catch (updateError) {
      console.error('Failed to update user profile:', updateError);
      const response = NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }
    const response = NextResponse.json(
      { 
        message: 'Profile updated successfully',
        user: { id: user.id, email: sanitizedEmail }
      },
      { status: 200 }
    );

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Profile update error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
