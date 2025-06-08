import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAuth } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, validateCSRFToken } from '@/lib/security';
import { database } from '@/lib/database';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// Validation schema for user preferences
const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  viewMode: z.enum(['grid', 'list']).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    // Validate request origin
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    ];
    
    if (!validateOrigin(request, allowedOrigins)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      ));
    }

    // Validate CSRF token
    const csrfValid = validateCSRFToken(request);
    if (!csrfValid) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      ));
    }

    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.valid || !authResult.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    const body = await request.json();
    
    // Validate input
    const validation = preferencesSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { theme, viewMode } = validation.data;

    // Update user preferences
    const updateData: any = {};
    if (theme) updateData.theme = theme;
    if (viewMode) updateData.viewMode = viewMode;

    if (Object.keys(updateData).length === 0) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'No preferences to update' },
        { status: 400 }
      ));
    }

    await database.user.update({
      where: { id: authResult.user.id },
      data: updateData,
    });

    const response = NextResponse.json(
      { message: 'Preferences updated successfully' },
      { status: 200 }
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Preferences update error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
