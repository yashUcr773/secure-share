import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ContactStorage } from '@/lib/storage';
import { generalRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFToken } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for contact form
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message too long'),
  type: z.enum(['general', 'feedback', 'feature', 'bug']).default('general'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for contact form
    const identifier = createRateLimitIdentifier(request, 'contact');
    const rateLimitResult = await checkRateLimit(request, generalRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
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

    // Validate CSRF token (for non-authenticated users, use basic validation)
    const csrfValid = validateCSRFToken(request);
    if (!csrfValid) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      ));
    }

    const body = await request.json();
    
    // Validate input
    const validation = contactFormSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }    const { name, email, subject, message, type, priority } = validation.data;

    // Sanitize inputs to prevent XSS
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email.toLowerCase().trim()),
      subject: sanitizeInput(subject),
      message: sanitizeInput(message),
      type,
      priority,
    };// Save the contact message to storage
    const savedMessage = await ContactStorage.saveMessage({
      ...sanitizedData,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });    // In production, you would also:
    // 1. Send an email to the support team
    // 2. Send a confirmation email to the user
    // 3. Add additional spam protection (captcha, etc.)
      const response = NextResponse.json(
      { 
        message: type === 'feedback' ? 'Feedback received successfully' :
                type === 'feature' ? 'Feature request submitted successfully' :
                type === 'bug' ? 'Bug report submitted successfully' :
                'Message sent successfully',
        id: savedMessage.id,
        type
      },
      { status: 200 }
    );

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Contact form error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
