import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';

// Validation schema for notification settings
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  shareNotifications: z.boolean(),
  securityAlerts: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validation = notificationSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    // TODO: Save notification settings to user preferences
    // For now, just return success
    return NextResponse.json(
      { 
        message: 'Notification settings updated successfully',
        settings: validation.data
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Notification settings update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // TODO: Get notification settings from user preferences
    // For now, return default settings
    const defaultSettings = {
      emailNotifications: true,
      shareNotifications: true,
      securityAlerts: true,
    };

    return NextResponse.json(
      { settings: defaultSettings },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
