// Resend email verification endpoint for SecureShare
// Allows users to request a new verification email

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { UserService, RateLimitService } from '@/lib/database';
import { addSecurityHeaders, sanitizeInput, validateOrigin } from '@/lib/security';
import { getClientIP } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schema
const resendVerificationSchema = z.object({
  email: z.string().email().max(254)
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using database
    const clientIp = getClientIP(request);
    const identifier = `resend_verification:${clientIp}`;
    const rateLimitResult = await RateLimitService.checkRateLimit(
      identifier, 
      'resend_verification', 
      3, 
      15 * 60 * 1000 // 3 attempts per 15 minutes
    );
    
    if (!rateLimitResult.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many verification email requests. Please try again later.' },
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
    
    // Sanitize and validate input
    const sanitizedBody = {
      email: sanitizeInput(body.email?.toLowerCase()?.trim() || '')
    };

    const validation = resendVerificationSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid email format', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { email } = validation.data;    // Get user by email
    const user = await UserService.getUserByEmail(email);
    
    if (!user || !user.isActive) {      // Don't reveal if email exists for security
      const response = NextResponse.json(
        { 
          success: true,
          message: 'If an account with that email exists and is not verified, we\'ve sent a new verification email.'
        },
        { status: 200 }
      );
      
      return addSecurityHeaders(response);
    }

    if (user.emailVerified) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      ));
    }

    // Initiate new email verification
    const result = await AuthService.initiateEmailVerification(user.id);
    
    if (!result.success) {
      console.error('Failed to resend verification email:', result.error);
    }    // Always return success to prevent email enumeration
    const response = NextResponse.json(
      { 
        success: true,
        message: 'A new verification email has been sent. Please check your email and follow the instructions.'
      },
      { status: 200 }
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Resend verification email error:', error);
    
    // Always return success to prevent information leakage
    const response = NextResponse.json(
      { 
        success: true,
        message: 'If an account with that email exists and is not verified, we\'ve sent a new verification email.'
      },
      { status: 200 }
    );
    return addSecurityHeaders(response);
  }
}
