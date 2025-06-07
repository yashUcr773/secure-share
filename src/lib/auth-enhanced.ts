// Enhanced Authentication service using database layer
// Provides secure, scalable user management with proper concurrency and session handling
//
// Key improvements over file-based storage:
// - Database Integration: All user/session data is persisted in a production-grade database (see UserService, SessionService)
// - Scalable: No file-based storage; supports high concurrency and large user bases
// - Safe for Production: Avoids race conditions and data loss inherent in file-based systems
// - Concurrency: Database transactions ensure safe concurrent operations
//
// This service is suitable for production deployments.

import jwt from 'jsonwebtoken';
import { config } from './config';
import { UserService, SessionService } from './database';
import type { User } from '../generated/prisma';

// Enhanced JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Login result interface
export interface LoginResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

// Registration result interface
export interface RegisterResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  error?: string;
}

// Token verification result
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  user?: User;
  error?: string;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';
  private static readonly ISSUER = 'secureshare';
  private static readonly AUDIENCE = 'secureshare-users';

  /**
   * Hash a password using PBKDF2
   */
  static async hashPassword(password: string): Promise<string> {
    const iterations = config.keyDerivationIterations;
    
    if (typeof window !== 'undefined') {
      // Browser environment - use Web Crypto API
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      // Generate salt
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      // Import password as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      
      // Derive key
      const derivedKey = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      
      // Combine salt and derived key
      const hashArray = new Uint8Array(salt.length + derivedKey.byteLength);
      hashArray.set(salt);
      hashArray.set(new Uint8Array(derivedKey), salt.length);
      
      return btoa(String.fromCharCode(...hashArray));
    } else {
      // Node.js environment
      const crypto = await import('crypto');
      const salt = crypto.randomBytes(32);
      const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
      
      // Combine salt and derived key
      const hashBuffer = Buffer.concat([salt, derivedKey]);
      return hashBuffer.toString('base64');
    }
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const hashBuffer = typeof window !== 'undefined' 
        ? Uint8Array.from(atob(hash), c => c.charCodeAt(0))
        : Buffer.from(hash, 'base64');
      
      const salt = hashBuffer.slice(0, 32);
      const storedKey = hashBuffer.slice(32);
      const iterations = config.keyDerivationIterations;

      if (typeof window !== 'undefined') {
        // Browser environment
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          passwordBuffer,
          { name: 'PBKDF2' },
          false,
          ['deriveBits']
        );
        
        const derivedKey = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256',
          },
          keyMaterial,
          256
        );

        const derivedKeyArray = new Uint8Array(derivedKey);
        
        return derivedKeyArray.length === storedKey.length &&
               derivedKeyArray.every((byte, index) => byte === storedKey[index]);
      } else {
        // Node.js environment
        const nodeCrypto = await import('crypto');
        const derivedKey = nodeCrypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
        
        return derivedKey.length === storedKey.length &&
               derivedKey.every((byte, index) => byte === storedKey[index]);
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure JWT tokens
   */
  static async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    if (!config.jwtSecret) {
      throw new Error('JWT secret not configured');
    }

    const sessionId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Create access token (short-lived)
    const accessPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      sessionId,
      type: 'access',
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      iss: this.ISSUER,
      aud: this.AUDIENCE,
    };

    // Create refresh token (long-lived)
    const refreshPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      sessionId,
      type: 'refresh',
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
      iss: this.ISSUER,
      aud: this.AUDIENCE,
    };

    const accessToken = jwt.sign(accessPayload, config.jwtSecret, {
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(refreshPayload, config.jwtSecret, {
      algorithm: 'HS256',
    });

    // Store session in database
    await SessionService.createSession({
      userId: user.id,
      token: sessionId,
      expiresAt: new Date(refreshPayload.exp * 1000),
    });

    return { accessToken, refreshToken, sessionId };
  }

  /**
   * Verify and decode a JWT token
   */
  static async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      if (!config.jwtSecret) {
        return { valid: false, error: 'JWT secret not configured' };
      }

      const payload = jwt.verify(token, config.jwtSecret, {
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
        algorithms: ['HS256'],
      }) as JWTPayload;

      // Verify session is still valid
      const session = await SessionService.getValidSession(payload.sessionId);
      if (!session) {
        return { valid: false, error: 'Session invalid or expired' };
      }

      // Get user data
      const user = await UserService.getUserById(payload.userId);
      if (!user || !user.isActive) {
        return { valid: false, error: 'User not found or inactive' };
      }

      return {
        valid: true,
        payload,
        user,
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Token verification failed' 
      };
    }
  }

  /**
   * Register a new user
   */
  static async register(email: string, password: string, name?: string): Promise<RegisterResult> {
    try {
      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const user = await UserService.createUser({
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name?.trim(),
      });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Authenticate a user
   */
  static async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Get user by email
      const user = await UserService.getUserByEmail(email);
      if (!user || !user.isActive) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return { 
        success: true, 
        user: userWithoutPassword, 
        accessToken,
        refreshToken 
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken?: string; error?: string }> {
    try {
      const verification = await this.verifyToken(refreshToken);
      
      if (!verification.valid || !verification.payload || !verification.user) {
        return { error: 'Invalid refresh token' };
      }

      if (verification.payload.type !== 'refresh') {
        return { error: 'Invalid token type' };
      }

      // Generate new access token
      const now = Math.floor(Date.now() / 1000);
      const accessPayload: JWTPayload = {
        userId: verification.user.id,
        email: verification.user.email,
        sessionId: verification.payload.sessionId,
        type: 'access',
        iat: now,
        exp: now + (15 * 60), // 15 minutes
        iss: this.ISSUER,
        aud: this.AUDIENCE,
      };

      const accessToken = jwt.sign(accessPayload, config.jwtSecret!, {
        algorithm: 'HS256',
      });

      return { accessToken };

    } catch (error) {
      console.error('Token refresh error:', error);
      return { error: 'Token refresh failed' };
    }
  }

  /**
   * Logout user by revoking session
   */
  static async logout(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const verification = await this.verifyToken(token);
      
      if (!verification.valid || !verification.payload) {
        return { success: false, error: 'Invalid token' };
      }

      await SessionService.revokeSession(verification.payload.sessionId);
      return { success: true };

    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  /**
   * Logout all sessions for a user
   */
  static async logoutAll(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await SessionService.revokeAllUserSessions(userId);
      return { success: true };
    } catch (error) {
      console.error('Logout all error:', error);
      return { success: false, error: 'Logout all failed' };
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user
      const user = await UserService.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Validate new password
      if (newPassword.length < 8) {
        return { success: false, error: 'New password must be at least 8 characters' };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update user
      await UserService.updateUser(userId, { passwordHash: newPasswordHash });

      // Revoke all existing sessions for security
      await SessionService.revokeAllUserSessions(userId);

      return { success: true };

    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: 'Password update failed' };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: { email?: string; name?: string }): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; error?: string }> {
    try {
      // Check if email is already in use by another user
      if (data.email) {
        const existingUser = await UserService.getUserByEmail(data.email);
        if (existingUser && existingUser.id !== userId) {
          return { success: false, error: 'Email already in use' };
        }
      }

      // Update user
      const updatedUser = await UserService.updateUser(userId, data);

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      return { success: true, user: userWithoutPassword };

    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Profile update failed' };
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // This will cascade delete all related data due to Prisma schema relations
      await UserService.deleteUser(userId);
      return { success: true };

    } catch (error) {
      console.error('Account deletion error:', error);
      return { success: false, error: 'Account deletion failed' };
    }
  }

  /**
   * Get current user from request (for API routes)
   */
  static async getCurrentUser(request: Request): Promise<User | null> {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      const verification = await this.verifyToken(token);

      return verification.valid ? verification.user || null : null;

    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get user from cookie token (for API routes)
   */
  static async getUserFromCookie(cookieToken: string): Promise<User | null> {
    try {
      const verification = await this.verifyToken(cookieToken);
      return verification.valid ? verification.user || null : null;

    } catch (error) {
      console.error('Get user from cookie error:', error);
      return null;
    }
  }

  /**
   * Generate a unique user ID (fallback for non-database scenarios)
   */
  static generateUserId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${randomPart}`;
  }

  /**
   * Revoke a refresh token and its associated session
   */
  static async revokeToken(refreshToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify and decode the refresh token to get the session ID
      const payload = jwt.verify(refreshToken, config.jwtSecret) as JWTPayload;
      
      if (payload.type !== 'refresh') {
        return { success: false, error: 'Invalid token type' };
      }

      // Revoke the session in the database
      await SessionService.revokeSession(payload.sessionId);
      
      return { success: true };
    } catch (error) {
      console.error('Token revocation error:', error);
      return { success: false, error: 'Invalid or expired token' };
    }
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(): string {
    return Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(): string {
    return Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
  }

  /**
   * Initiate password reset
   */
  static async initiatePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await UserService.getUserByEmail(email);
      if (!user || !user.isActive) {
        // Don't reveal if email exists for security
        return { success: true };
      }

      const resetToken = this.generatePasswordResetToken();
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1); // 1 hour expiry

      await UserService.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: expiryDate
      });

      // Send email with reset link
      const { EmailService } = await import('./email');
      const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
      const emailResult = await EmailService.sendPasswordResetEmail(user.email, resetLink);
      
      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error);
        // Still return success to prevent email enumeration
      }

      console.log(`Password reset token generated for user ${user.id}: ${resetToken}`);
      
      return { success: true };
    } catch (error) {
      console.error('Password reset initiation error:', error);
      return { success: false, error: 'Failed to initiate password reset' };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate new password
      if (!newPassword || newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      // Find user by reset token
      const user = await UserService.getUserByPasswordResetToken(token);
      if (!user) {
        return { success: false, error: 'Invalid reset token' };
      }

      // Check if token is still valid
      if (!user.passwordResetTokenExpiry || 
          new Date() > new Date(user.passwordResetTokenExpiry)) {
        return { success: false, error: 'Reset token expired' };
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update password and clear reset token
      await UserService.updateUser(user.id, {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      });

      // Revoke all existing sessions for security
      await SessionService.revokeAllUserSessions(user.id);

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }

  /**
   * Initiate email verification
   */
  static async initiateEmailVerification(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await UserService.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.emailVerified) {
        return { success: false, error: 'Email already verified' };
      }

      const verificationToken = this.generateEmailVerificationToken();
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24); // 24 hour expiry

      await UserService.updateUser(userId, {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: expiryDate
      });

      // Send email with verification link
      const { EmailService } = await import('./email');
      const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
      const emailResult = await EmailService.sendVerificationEmail(user.email, verificationLink);
      
      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Continue anyway - user can request another verification email
      }

      console.log(`Email verification token generated for user ${userId}: ${verificationToken}`);
      
      return { success: true };
    } catch (error) {
      console.error('Email verification initiation error:', error);
      return { success: false, error: 'Failed to initiate email verification' };
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user by verification token
      const user = await UserService.getUserByEmailVerificationToken(token);
      if (!user) {
        return { success: false, error: 'Invalid verification token' };
      }

      // Check if token is still valid
      if (!user.emailVerificationTokenExpiry || 
          new Date() > new Date(user.emailVerificationTokenExpiry)) {
        return { success: false, error: 'Verification token expired' };
      }

      // Update user as verified and clear verification token
      await UserService.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      });

      return { success: true };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, error: 'Email verification failed' };
    }
  }
}

// Legacy compatibility layer for existing code
export class LegacyAuthService {
  /**
   * Simple token generation for development (deprecated)
   */
  static async generateToken(user: { id: string; email: string }): Promise<string> {
    console.warn('LegacyAuthService.generateToken is deprecated. Use AuthService.generateTokens instead.');
    
    if (config.jwtSecret) {
      // Use proper JWT if secret is available
      const payload = {
        userId: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      };
      return jwt.sign(payload, config.jwtSecret);
    } else {
      // Fallback to base64 for development
      const payload = {
        userId: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      };
      return btoa(JSON.stringify(payload));
    }
  }

  /**
   * Simple token verification for development (deprecated)
   */
  static async verifyToken(token: string): Promise<any> {
    console.warn('LegacyAuthService.verifyToken is deprecated. Use AuthService.verifyToken instead.');
    
    try {
      if (config.jwtSecret && !token.includes('.') === false) {
        // Try JWT verification first
        return jwt.verify(token, config.jwtSecret);
      } else {
        // Fallback to base64 decoding
        const payload = JSON.parse(atob(token));
        
        // Check expiration
        if (payload.exp < Math.floor(Date.now() / 1000)) {
          return null; // Token expired
        }

        return payload;
      }
    } catch (error) {
      console.error('Legacy token verification error:', error);
      return null;
    }
  }
}

export default AuthService;
