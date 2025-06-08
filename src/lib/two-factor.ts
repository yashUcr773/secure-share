// Two-Factor Authentication utilities for SecureShare
// Supports TOTP (Time-based One-Time Password) using RFC 6238

import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  valid: boolean;
  error?: string;
}

export class TwoFactorService {
  private static readonly APP_NAME = 'SecureShare';

  /**
   * Generate a new 2FA secret and setup data
   */  static async generateSetup(userEmail: string): Promise<TwoFactorSetup> {
    // Generate secret
    const secret = authenticator.generateSecret();
    
    // Generate otpauth URL
    const otpauthUrl = authenticator.keyuri(userEmail, this.APP_NAME, secret);

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(token: string, secret: string): TwoFactorVerification {
    try {
      const isValid = authenticator.verify({
        token: token.replace(/\s/g, ''), // Remove any spaces
        secret
      });

      return { valid: isValid };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { valid: false, error: 'Invalid token format' };
    }
  }

  /**
   * Verify a backup code
   */
  static verifyBackupCode(code: string, validCodes: string[]): { valid: boolean; remainingCodes?: string[] } {
    const normalizedCode = code.replace(/\s/g, '').toLowerCase();
    const codeIndex = validCodes.findIndex(validCode => 
      validCode.toLowerCase() === normalizedCode
    );

    if (codeIndex === -1) {
      return { valid: false };
    }

    // Remove the used backup code
    const remainingCodes = validCodes.filter((_, index) => index !== codeIndex);

    return { valid: true, remainingCodes };
  }

  /**
   * Generate backup codes for 2FA recovery
   */
  private static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Array.from({ length: 8 }, () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      
      codes.push(code);
    }

    return codes;
  }

  /**
   * Check if 2FA is required for login based on user settings
   */  static isTwoFactorRequired(user: { twoFactorSecret?: string | null; twoFactorEnabled?: boolean }): boolean {
    return !!(user.twoFactorSecret && user.twoFactorEnabled);
  }

  /**
   * Generate a temporary 2FA bypass token for setup
   */
  static generateBypassToken(): string {
    return Array.from({ length: 32 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
  }
}
