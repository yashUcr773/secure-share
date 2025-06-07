// Email verification endpoint for SecureShare
// Handles email verification with tokens

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders } from '@/lib/security';
import { RateLimitService } from '@/lib/database';
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
    // Apply rate limiting using database service
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'email_verification',
      request.ip || 'unknown',
      5, // max attempts
      15 * 60 * 1000 // 15 minutes window
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '5');
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', new Date(Date.now() + (15 * 60 * 1000)).toISOString());
      
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
    response.headers.set('X-RateLimit-Limit', '5');
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

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

    // Apply rate limiting using database service
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'email_verification_get',
      request.ip || 'unknown',
      5, // max attempts
      15 * 60 * 1000 // 15 minutes window
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '5');
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', new Date(Date.now() + (15 * 60 * 1000)).toISOString());
      
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
    response.headers.set('X-RateLimit-Limit', '5');
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

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
