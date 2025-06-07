import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService, UserService } from '@/lib/database';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFWithSession } from '@/lib/security';
import { getClientIP } from '@/lib/rate-limit';

// Validation schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using database
    const clientIp = getClientIP(request);
    const identifier = `auth_password:${clientIp}`;
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'password_change', 
      5, 
      60 * 60 * 1000 // 5 attempts per hour
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many password change attempts. Please try again later.' },
        { status: 429 }
      ));
    }

    // Origin validation for CSRF protection
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    ];
    
    if (!validateOrigin(request, allowedOrigins)) {
      const response = NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }    const token = request.cookies.get('auth-token')?.value;
    
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

    const currentUser = verification.user;

    // Note: CSRF validation would need to be implemented separately if required
    // as it's not available in the enhanced auth service yet

    const body = await request.json();
    
    // Sanitize and validate input
    const sanitizedBody = {
      currentPassword: sanitizeInput(body.currentPassword),
      newPassword: sanitizeInput(body.newPassword)
    };

    const validation = passwordChangeSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      const response = NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }    const { currentPassword, newPassword } = validation.data;

    // Verify current password using the user from verification
    const isValidPassword = await AuthService.verifyPassword(currentPassword, currentUser.passwordHash);
    if (!isValidPassword) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      ));
    }    // Update password using enhanced auth service
    const updateResult = await AuthService.updatePassword(currentUser.id, currentPassword, newPassword);

    if (!updateResult.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: updateResult.error || 'Failed to update password' },
        { status: 500 }
      ));
    }

    const response = NextResponse.json(
      { message: 'Password changed successfully' },
      { status: 200 }
    );    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value as string);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Password change error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
