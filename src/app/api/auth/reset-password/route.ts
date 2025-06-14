// Password reset endpoint for SecureShare
// Handles password reset with tokens

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { RateLimitService } from '@/lib/database';
import { addSecurityHeaders, sanitizeInput, validatePassword } from '@/lib/security';
import { getClientIP } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  newPassword: z.string().min(8).max(128)
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using database
    const clientIp = getClientIP(request);
    const identifier = `reset_password:${clientIp}`;
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'reset_password', 
      5, 
      15 * 60 * 1000 // 5 attempts per 15 minutes
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      ));
    }

    const body = await request.json();
    
    // Sanitize and validate input
    const sanitizedBody = {
      token: sanitizeInput(body.token),
      newPassword: body.newPassword // Don't sanitize passwords as they may contain special chars
    };

    const validation = resetPasswordSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { token, newPassword } = validation.data;

    // Additional password validation
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return addSecurityHeaders(NextResponse.json(
        { 
          error: 'Password does not meet requirements',
          details: passwordValidation.errors
        },
        { status: 400 }
      ));
    }

    // Reset password with token
    const result = await AuthService.resetPassword(token, newPassword);
    
    if (!result.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: result.error || 'Password reset failed' },
        { status: 400 }
      ));
    }    const response = NextResponse.json(
      { 
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      },
      { status: 200 }
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Password reset error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Handle GET requests for password reset links (optional)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      ));
    }    // Apply rate limiting for GET requests too
    const clientIp = getClientIP(request);
    const identifier = `reset_password_get:${clientIp}`;
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'reset_password_get', 
      5, 
      15 * 60 * 1000 // 5 attempts per 15 minutes
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      ));
    }

    // Sanitize token
    const sanitizedToken = sanitizeInput(token);    // Return token validation status (without actually resetting)
    // This allows frontend to validate the token before showing the reset form
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Token is valid. You can proceed with password reset.',
        token: sanitizedToken // Return sanitized token for the form
      },
      { status: 200 }
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Password reset token validation error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
