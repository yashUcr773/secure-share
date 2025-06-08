import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { TwoFactorService } from '@/lib/two-factor';
import { UserService } from '@/lib/database';
import { addSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const setupSchema = z.object({
  token: z.string().min(6).max(6).regex(/^\d{6}$/, 'Token must be 6 digits')
});

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ));
    }

    const verification = await AuthService.verifyToken(token);
    
    if (!verification.valid || !verification.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const user = verification.user;

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Two-factor authentication is already enabled' },
        { status: 400 }
      ));
    }

    // Generate 2FA setup data
    const setupData = await TwoFactorService.generateSetup(user.email);

    // Store the secret temporarily (not enabled until verified)
    await UserService.updateUser(user.id, {
      twoFactorSecret: setupData.secret,
      twoFactorBackupCodes: setupData.backupCodes,
      twoFactorEnabled: false // Not enabled until first verification
    });

    const response = NextResponse.json({
      qrCodeUrl: setupData.qrCodeUrl,
      backupCodes: setupData.backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a token'
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('2FA setup error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ));
    }

    const verification = await AuthService.verifyToken(token);
    
    if (!verification.valid || !verification.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const user = verification.user;
    const body = await request.json();

    // Validate input
    const validation = setupSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token format', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const { token: totpToken } = validation.data;

    // Check if user has a temporary secret
    if (!user.twoFactorSecret) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'No 2FA setup in progress. Please start setup first.' },
        { status: 400 }
      ));
    }

    // Verify the TOTP token
    const verificationResult = TwoFactorService.verifyToken(totpToken, user.twoFactorSecret);
    
    if (!verificationResult.valid) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      ));
    }

    // Enable 2FA
    await UserService.updateUser(user.id, {
      twoFactorEnabled: true
    });

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been successfully enabled!'
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('2FA verification error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ));
    }

    const verification = await AuthService.verifyToken(token);
    
    if (!verification.valid || !verification.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const user = verification.user;

    // Disable 2FA
    await UserService.updateUser(user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null
    });

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been disabled'
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('2FA disable error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
