import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { TwoFactorService } from '@/lib/two-factor';
import { UserService } from '@/lib/database';
import { addSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const verifySchema = z.object({
  token: z.string().min(6).max(6).regex(/^\d{6}$/, 'Token must be 6 digits'),
  rememberDevice: z.boolean().optional()
});

const backupCodeSchema = z.object({
  code: z.string().min(8).max(8).regex(/^[A-Z0-9]{8}$/, 'Invalid backup code format'),
  rememberDevice: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a backup code verification
    if (body.code) {
      return await verifyBackupCode(request, body);
    } else {
      return await verifyTotpToken(request, body);
    }

  } catch (error) {
    console.error('2FA verification error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

async function verifyTotpToken(request: NextRequest, body: { token: string; rememberDevice?: boolean }) {
  // Get pending login session from cookies or headers
  const pendingSession = request.cookies.get('pending-2fa-session')?.value;
  
  if (!pendingSession) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'No pending 2FA session' },
      { status: 400 }
    ));
  }
  // Decode pending session (in real implementation, this would be encrypted/signed)
  let sessionData;
  try {
    sessionData = JSON.parse(atob(pendingSession));
  } catch {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid session data' },
      { status: 400 }
    ));
  }

  const validation = verifySchema.safeParse(body);
  if (!validation.success) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid token format', details: validation.error.errors },
      { status: 400 }
    ));
  }

  const { token, rememberDevice } = validation.data;

  // Get user
  const user = await UserService.getUserById(sessionData.userId);
  if (!user || !user.twoFactorSecret) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid session' },
      { status: 400 }
    ));
  }

  // Verify TOTP token
  const verificationResult = TwoFactorService.verifyToken(token, user.twoFactorSecret);
  
  if (!verificationResult.valid) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid verification code' },
      { status: 400 }
    ));
  }

  // Generate final auth tokens
  const { accessToken, refreshToken } = await AuthService.generateTokens(user);

  const response = NextResponse.json({
    success: true,
    message: 'Two-factor authentication successful',
    user: { 
      id: user.id, 
      email: user.email,
      name: user.name 
    }
  });

  // Set auth cookies
  response.cookies.set('auth-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60, // 15 minutes
    path: '/'
  });

  response.cookies.set('refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  });

  // Clear pending session
  response.cookies.delete('pending-2fa-session');

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
}

async function verifyBackupCode(request: NextRequest, body: { code: string; rememberDevice?: boolean }) {
  const pendingSession = request.cookies.get('pending-2fa-session')?.value;
  
  if (!pendingSession) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'No pending 2FA session' },
      { status: 400 }
    ));
  }
  let sessionData;
  try {
    sessionData = JSON.parse(atob(pendingSession));
  } catch {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid session data' },
      { status: 400 }
    ));
  }

  const validation = backupCodeSchema.safeParse(body);
  if (!validation.success) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid backup code format', details: validation.error.errors },
      { status: 400 }
    ));
  }

  const { code, rememberDevice } = validation.data;
  // Get user
  const user = await UserService.getUserById(sessionData.userId);
  if (!user || !user.twoFactorBackupCodes) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid session or no backup codes' },
      { status: 400 }
    ));
  }

  // Verify backup code - ensure backup codes is an array
  const backupCodes = Array.isArray(user.twoFactorBackupCodes) 
    ? user.twoFactorBackupCodes 
    : JSON.parse(user.twoFactorBackupCodes as string);
  
  const verificationResult = TwoFactorService.verifyBackupCode(code, backupCodes);
  
  if (!verificationResult.valid) {
    return addSecurityHeaders(NextResponse.json(
      { error: 'Invalid backup code' },
      { status: 400 }
    ));
  }

  // Update user with remaining backup codes
  await UserService.updateUser(user.id, {
    twoFactorBackupCodes: verificationResult.remainingCodes
  });

  // Generate final auth tokens
  const { accessToken, refreshToken } = await AuthService.generateTokens(user);

  const response = NextResponse.json({
    success: true,
    message: 'Backup code verification successful',
    user: { 
      id: user.id, 
      email: user.email,
      name: user.name 
    },
    remainingBackupCodes: verificationResult.remainingCodes?.length || 0
  });

  // Set auth cookies
  response.cookies.set('auth-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60,
    path: '/'
  });

  response.cookies.set('refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/'
  });

  // Clear pending session
  response.cookies.delete('pending-2fa-session');

  // Set device trust cookie if requested
  if (rememberDevice) {
    const deviceToken = TwoFactorService.generateBypassToken();
    response.cookies.set('trusted-device', deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    });
  }

  return addSecurityHeaders(response);
}
