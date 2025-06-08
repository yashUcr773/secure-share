// Password reset initiation endpoint for SecureShare
// Handles password reset requests

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, sanitizeInput, validateEmail } from '@/lib/security';
import { createRateLimitIdentifier, checkRateLimit, passwordResetRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email().max(254)
});

export async function POST(request: NextRequest) {
  try {    // Apply rate limiting - very restrictive for password reset requests
    const identifier = createRateLimitIdentifier(request, 'forgot_password');
    const rateLimitResult = await checkRateLimit(request, passwordResetRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      
      return addSecurityHeaders(response);
    }

    const body = await request.json();
    
    // Sanitize and validate input
    const sanitizedBody = {
      email: sanitizeInput(body.email?.toLowerCase()?.trim() || '')
    };

    const validation = forgotPasswordSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid email format', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { email } = validation.data;

    // Additional email validation
    if (!validateEmail(email)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      ));
    }    // Initiate password reset
    await AuthService.initiatePasswordReset(email);
      // Always return success to prevent email enumeration
    // Even if the email doesn't exist, we return success
    const response = NextResponse.json(
      { 
        success: true,
        message: 'If an account with that email exists, we\'ve sent a password reset link. Please check your email and follow the instructions.'
      },
      { status: 200 }
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Password reset initiation error:', error);
    
    // Always return success to prevent information leakage
    const response = NextResponse.json(
      { 
        success: true,
        message: 'If an account with that email exists, we\'ve sent a password reset link. Please check your email and follow the instructions.'
      },
      { status: 200 }
    );
    return addSecurityHeaders(response);
  }
}
