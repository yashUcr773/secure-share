// Edge-compatible authentication utilities for middleware
// This version works in Next.js Edge Runtime

import { jwtVerify } from 'jose';

export interface JWTPayload {
  userId: string;
  email: string;
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
      const secret = process.env.JWT_SECRET || 'dev-fallback-secret-key-not-for-production';
      
      if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
        console.error('JWT_SECRET must be set in production');
        return null;
      }

      // Use jose library for edge runtime JWT verification
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(secret);
      
      const { payload } = await jwtVerify(token, secretKey, {
        issuer: 'secure-share',
        audience: 'secure-share-users'
      });      // Validate payload structure and cast
      if (typeof payload.userId === 'string' && typeof payload.email === 'string') {
        return payload as unknown as JWTPayload;
      }
      
      return null;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }
}
