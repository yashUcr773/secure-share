import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { generalRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput, validateCSRFWithSession } from '@/lib/security';

// Validation schema for notification settings
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  shareNotifications: z.boolean(),
  securityAlerts: z.boolean(),
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = createRateLimitIdentifier(request, 'notifications-update');
    const rateLimitResult = await checkRateLimit(request, generalRateLimit, rateLimitId);
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many notification update attempts. Please try again later.' },
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
    }    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      const response = NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const payload = await AuthService.verifyToken(token);
    
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
      emailNotifications: Boolean(body.emailNotifications),
      shareNotifications: Boolean(body.shareNotifications),
      securityAlerts: Boolean(body.securityAlerts)
    };

    const validation = notificationSettingsSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      const response = NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // TODO: Save notification settings to user preferences
    // For now, just return success
    const response = NextResponse.json(
      { 
        message: 'Notification settings updated successfully',
        settings: validation.data
      },
      { status: 200 }
    );
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Notification settings update error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = createRateLimitIdentifier(request, 'notifications-get');
    const rateLimitResult = await checkRateLimit(request, generalRateLimit, rateLimitId);
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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
    }

    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      const response = NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // TODO: Get notification settings from user preferences
    // For now, return default settings
    const defaultSettings = {
      emailNotifications: true,
      shareNotifications: true,
      securityAlerts: true,
    };

    const response = NextResponse.json(
      { settings: defaultSettings },
      { status: 200 }
    );
    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Get notification settings error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
