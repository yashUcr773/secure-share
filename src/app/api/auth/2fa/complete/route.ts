// Complete 2FA verification and finalize login
import { NextRequest, NextResponse } from 'next/server';
import { TwoFactorService } from '@/lib/two-factor';
import { addSecurityHeaders } from '@/lib/security';
import { z } from 'zod';
import type { User } from '@/generated/prisma';

const complete2FASchema = z.object({
  tempSession: z.string().min(1),
  token: z.string().min(6).max(6).regex(/^\d{6}$/, 'Token must be 6 digits'),
  rememberDevice: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = complete2FASchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid request format', details: validation.error.errors },
        { status: 400 }
      ));
    }    const { tempSession, token, rememberDevice } = validation.data;    // Retrieve temporary session data
    interface TempSessionData {
      userId: string;
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    }
    
    interface GlobalTempSessions {
      tempSessions?: Map<string, TempSessionData>;
    }
    
    const tempSessions = (global as unknown as GlobalTempSessions).tempSessions || new Map<string, TempSessionData>();
    const sessionData = tempSessions.get(tempSession);

    if (!sessionData || sessionData.expiresAt < Date.now()) {
      tempSessions.delete(tempSession);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 400 }
      ));
    }

    // Get user for 2FA verification
    const { UserService } = await import('@/lib/database');    const user = await UserService.getUserById(sessionData.userId);

    if (!user || !(user as User & { twoFactorSecret?: string }).twoFactorSecret) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      ));
    }

    // Verify TOTP token
    const verificationResult = TwoFactorService.verifyToken(token, (user as User & { twoFactorSecret: string }).twoFactorSecret);
    
    if (!verificationResult.valid) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      ));
    }

    // Clean up temporary session
    tempSessions.delete(tempSession);

    // Create response with user data
    const response = NextResponse.json(
      { 
        message: 'Two-factor authentication successful',
        user: { 
          id: user.id, 
          email: user.email,
          name: user.name 
        }
      },
      { status: 200 }
    );

    // Set auth cookies
    response.cookies.set('auth-token', sessionData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    });

    response.cookies.set('refresh-token', sessionData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Set device trust cookie if requested
    if (rememberDevice) {
      const deviceToken = TwoFactorService.generateBypassToken();
      response.cookies.set('trusted-device', deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/'
      });
    }

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('2FA completion error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
