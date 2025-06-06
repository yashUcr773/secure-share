import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { authRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFWithSession } from '@/lib/security';

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
    // Rate limiting
    const rateLimitId = createRateLimitIdentifier(request, 'password-change');
    const rateLimitResult = await checkRateLimit(request, authRateLimit, rateLimitId);
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many password change attempts. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
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
    }

    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      const response = NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      const response = NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
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
    }

    const { currentPassword, newPassword } = validation.data;    // Get current user
    const user = await AuthService.getUserById(payload.userId);
    
    if (!user) {
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Verify current password
    const isValidPassword = await AuthService.verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      const response = NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }    // Hash new password and update user
    const hashedNewPassword = await AuthService.hashPassword(newPassword);
    
    // Update user with new password hash
    const updateResult = await AuthService.updateUser(payload.userId, {
      passwordHash: hashedNewPassword
    });

    if (!updateResult.success) {
      const response = NextResponse.json(
        { error: updateResult.error || 'Failed to update password' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json(
      { message: 'Password changed successfully' },
      { status: 200 }
    );

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
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
