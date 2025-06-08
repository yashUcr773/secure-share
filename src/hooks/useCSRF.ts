// CSRF token management hook for SecureShare
// Provides client-side CSRF token generation and management

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CSRFTokenData {
  token: string;
  generated: number;
}

export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<CSRFTokenData | null>(null);

  // Token expiration time (30 minutes)
  const TOKEN_EXPIRY = 30 * 60 * 1000;
  /**
   * Generate a new CSRF token
   */
  const generateToken = useCallback((): string => {
    // Generate a cryptographically secure random token
    const array = new Uint8Array(32);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto.getRandomValues
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    const tokenData: CSRFTokenData = {
      token,
      generated: Date.now()
    };
    
    tokenRef.current = tokenData;
    setCSRFToken(token);
    
    // Store in sessionStorage for persistence across page reloads
    try {
      sessionStorage.setItem('csrf-token', JSON.stringify(tokenData));
    } catch (error) {
      console.warn('Failed to store CSRF token in sessionStorage:', error);
    }
    
    return token;
  }, []);
  /**
   * Check if the current token is valid and not expired
   */
  const isTokenValid = useCallback((tokenData: CSRFTokenData | null): boolean => {
    if (!tokenData || !tokenData.token) return false;
    
    const now = Date.now();
    const tokenAge = now - tokenData.generated;
    
    return tokenAge < TOKEN_EXPIRY;
  }, [TOKEN_EXPIRY]);

  /**
   * Get or generate a CSRF token
   */
  const getToken = (): string => {
    // Check if current token is still valid
    if (tokenRef.current && isTokenValid(tokenRef.current)) {
      return tokenRef.current.token;
    }
    
    // Generate new token if current one is invalid or expired
    return generateToken();
  };
  /**
   * Refresh the CSRF token (force regeneration)
   */
  const refreshToken = useCallback((): string => {
    return generateToken();
  }, [generateToken]);

  /**
   * Get headers object with CSRF token
   */
  const getHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
    return {
      'X-CSRF-Token': getToken(),
      'Content-Type': 'application/json',
      ...additionalHeaders
    };
  };

  /**
   * Enhanced fetch wrapper with automatic CSRF token inclusion
   */
  const csrfFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = getHeaders(options.headers as Record<string, string> || {});
    
    return fetch(url, {
      ...options,
      headers
    });
  };

  // Initialize CSRF token on mount
  useEffect(() => {
    try {
      // Try to restore token from sessionStorage
      const storedTokenData = sessionStorage.getItem('csrf-token');
      
      if (storedTokenData) {
        const tokenData: CSRFTokenData = JSON.parse(storedTokenData);
        
        if (isTokenValid(tokenData)) {
          tokenRef.current = tokenData;
          setCSRFToken(tokenData.token);
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to restore CSRF token from sessionStorage:', error);
    }
      // Generate new token if none exists or stored token is invalid
    generateToken();
    setIsLoading(false);
  }, [generateToken, isTokenValid]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!tokenRef.current) return;
    
    const timeUntilExpiry = TOKEN_EXPIRY - (Date.now() - tokenRef.current.generated);
    const refreshTime = Math.max(timeUntilExpiry - 60000, 60000); // Refresh 1 minute before expiry, but at least after 1 minute
    
    const timer = setTimeout(() => {
      refreshToken();
    }, refreshTime);
    
    return () => clearTimeout(timer);
  }, [csrfToken, TOKEN_EXPIRY, refreshToken]);

  return {
    token: csrfToken,
    isLoading,
    getToken,
    refreshToken,
    getHeaders,
    csrfFetch
  };
}
