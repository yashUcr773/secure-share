// Edge-compatible authentication utilities for middleware
// This version works in Next.js Edge Runtime

import { jwtVerify } from 'jose';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export class EdgeAuthService {
  /**
   * Verify and decode a token (Edge Runtime compatible with jose)
   */
  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      console.log('🔧 [EDGE AUTH DEBUG] Verifying token in edge runtime...');
      console.log('🔧 [EDGE AUTH DEBUG] Token length:', token.length);
      
      const secret = process.env.JWT_SECRET || 'dev-fallback-secret-key-not-for-production';
      
      if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
        console.error('JWT_SECRET must be set in production');
        return null;
      }

      console.log('🔧 [EDGE AUTH DEBUG] Using JWT secret length:', secret.length);

      // Use jose library for edge runtime JWT verification
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(secret);       
      
      console.log('🔧 [EDGE AUTH DEBUG] Calling jwtVerify...');
      
      const { payload } = await jwtVerify(token, secretKey, {
        issuer: 'secure-share',
        audience: 'secure-share-users'
      });

      console.log('🔧 [EDGE AUTH DEBUG] JWT payload decoded:', payload);

      // Validate payload structure and cast
      if (typeof payload.userId === 'string' &&
          typeof payload.email === 'string' && 
          typeof payload.role === 'string' &&
          (payload.role === 'user' || payload.role === 'admin')) {
        
        console.log('✅ [EDGE AUTH DEBUG] Token verification successful');
        return payload as unknown as JWTPayload;
      }
      
      console.log('❌ [EDGE AUTH DEBUG] Invalid payload structure');
      return null;
    } catch (error) {
      console.error('❌ [EDGE AUTH DEBUG] Token verification error:', error);
      return null;
    }
  }

  /**
   * Check if a user has admin privileges
   */
  static isAdmin(payload: JWTPayload): boolean {
    return payload.role === 'admin';
  }
}
