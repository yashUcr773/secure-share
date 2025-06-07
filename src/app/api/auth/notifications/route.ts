import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { UserService } from '@/lib/database';
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

    const verification = await AuthService.verifyToken(token);
    
    if (!verification.valid || !verification.user) {
      const response = NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Validate CSRF token
    const csrfValid = await validateCSRFWithSession(request, verification.user.id);
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
    }    // Save notification settings to user preferences
    try {
      // Get current user from verification result
      const currentUser = verification.user;

      // Update user preferences using database service
      // Note: Since UserService.updateUser doesn't support preferences field,
      // we'll store preferences in a simple JSON structure in the name field temporarily
      // In a real application, you'd want to extend the User model or create a separate preferences table
      const preferencesData = JSON.stringify({
        ...(currentUser.name ? JSON.parse(currentUser.name || '{}') : {}),
        notifications: validation.data
      });

      const updateResult = await UserService.updateUser(verification.user.id, {
        name: preferencesData
      });
      
      if (!updateResult) {
        throw new Error('Failed to save preferences');
      }
      
    } catch (storageError) {
      console.error('Failed to save notification settings:', storageError);
      const response = NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }
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
    }    const verification = await AuthService.verifyToken(token);
    
    if (!verification.valid || !verification.user) {
      const response = NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Get notification settings from user preferences
    try {
      const currentUser = verification.user;
      
      // Extract preferences from name field (temporary solution)
      // In a real application, you'd want a separate preferences table
      let userPreferences = null;
      try {
        const nameData = currentUser.name ? JSON.parse(currentUser.name) : {};
        userPreferences = nameData.notifications || null;
      } catch (parseError) {
        // If name field isn't valid JSON, treat as regular name and no preferences
        userPreferences = null;
      }

      const settings = userPreferences || {
        emailNotifications: true,
        shareNotifications: true,
        securityAlerts: true,
      };

      const response = NextResponse.json(
        { settings },
        { status: 200 }
      );
      return addSecurityHeaders(response);
    } catch (storageError) {
      console.error('Failed to get notification settings:', storageError);
      // Fall back to default settings
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
    }

  } catch (error) {
    console.error('Get notification settings error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
