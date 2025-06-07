// Email verification endpoint for SecureShare
// Handles email verification with tokens

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { addSecurityHeaders } from '@/lib/security';
import { checkRateLimit, createRateLimitIdentifier } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/security';
import { z } from 'zod';

// Rate limiting - more restrictive for verification attempts
const verificationRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many verification attempts'
};

// Validation schema
const verificationSchema = z.object({
  token: z.string().min(32).max(128)
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'email_verification');
    const rateLimitResult = await checkRateLimit(request, verificationRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
    }

    const body = await request.json();
    
    // Sanitize and validate input
    const sanitizedBody = {
      token: sanitizeInput(body.token)
    };

    const validation = verificationSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid verification token format', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { token } = validation.data;

    // Verify email with token
    const result = await AuthService.verifyEmail(token);
    
    if (!result.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: result.error || 'Email verification failed' },
        { status: 400 }
      ));
    }

    const response = NextResponse.json(
      { 
        success: true,
        message: 'Email verified successfully. You can now login to your account.'
      },
      { status: 200 }
    );

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Email verification error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Handle GET requests for email verification links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      ));
    }

    // Apply rate limiting for GET requests too
    const identifier = createRateLimitIdentifier(request, 'email_verification_get');
    const rateLimitResult = await checkRateLimit(request, verificationRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
    }

    // Sanitize token
    const sanitizedToken = sanitizeInput(token);

    // Verify email with token
    const result = await AuthService.verifyEmail(sanitizedToken);
    
    if (!result.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: result.error || 'Email verification failed' },
        { status: 400 }
      ));
    }

    const response = NextResponse.json(
      { 
        success: true,
        message: 'Email verified successfully. You can now login to your account.'
      },
      { status: 200 }
    );

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Email verification error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
