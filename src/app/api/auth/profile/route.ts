import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService, UserService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFWithSession } from '@/lib/security';
import { getClientIP } from '@/lib/rate-limit';

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
    const clientIp = getClientIP(request);
    const identifier = `auth_profile:${clientIp}`;
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'profile_update', 
      10, 
      60 * 60 * 1000 // 10 updates per hour
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many profile update attempts. Please try again later.' },
        { status: 429 }
      ));
    }    // Validate request origin (CSRF protection)
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
    }

    const verification = await AuthService.verifyToken(token);
    
    if (!verification.valid || !verification.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    // Note: CSRF validation is not available in the enhanced auth service yet
    // This would need to be implemented separately if required

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

    const currentUser = verification.user;

    // Check if email is already in use by another user (if changed)
    if (sanitizedEmail !== currentUser.email.toLowerCase()) {
      const existingUser = await UserService.getUserByEmail(sanitizedEmail);
      if (existingUser && existingUser.id !== currentUser.id) {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        ));
      }
    }

    // Update user profile
    try {
      const updateResult = await AuthService.updateProfile(currentUser.id, {
        email: sanitizedEmail,
      });

      if (!updateResult.success) {
        return addSecurityHeaders(NextResponse.json(
          { error: updateResult.error || 'Failed to update profile' },
          { status: 500 }
        ));
      }

      const response = NextResponse.json({
        message: 'Profile updated successfully',
        user: { 
          id: currentUser.id, 
          email: sanitizedEmail,
          name: currentUser.name
        }
      });

      return addSecurityHeaders(response);

    } catch (updateError) {
      console.error('Failed to update user profile:', updateError);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      ));
    }

  } catch (error) {
    console.error('Profile update error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
