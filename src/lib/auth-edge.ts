// Edge-compatible authentication utilities for middleware
// This version works in Next.js Edge Runtime

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export class EdgeAuthService {
  /**
   * Verify and decode a token (Edge Runtime compatible)
   */
  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      // Simple base64 decoding for development
      const payload: JWTPayload = JSON.parse(atob(token));
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expired
      }

      return payload;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }
}
