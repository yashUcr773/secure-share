'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useCSRF } from '@/hooks/useCSRF';
import { authenticatedFetch, startTokenRefreshTimer } from '@/lib/token-refresh';
import type { User } from '@/generated/prisma';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    requiresVerification?: boolean; 
    message?: string; 
  }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { csrfFetch } = useCSRF();
  // Check for existing auth session on mount, but skip on auth pages
  useEffect(() => {
    // Skip auth check on authentication pages to prevent infinite redirects
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isAuthPage = pathname.startsWith('/auth/');
      
      if (!isAuthPage) {
        checkAuthStatus();
      } else {
        // On auth pages, just set loading to false without checking auth
        setLoading(false);
        
        // Also clear any existing tokens if we're on login page with expired parameter
        if (pathname === '/auth/login') {
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get('expired') === 'true') {
            // Clear any existing auth cookies
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        }
      }
    }
  }, []);
  // Start token refresh timer when user becomes authenticated
  useEffect(() => {
    if (user) {
      console.log('User authenticated, starting token refresh timer in 1 second');
      const timer = setTimeout(() => {
        startTokenRefreshTimer();
      }, 1000); // Increased delay to ensure login is complete
      
      return () => clearTimeout(timer);
    }
  }, [user]);
  const checkAuthStatus = async () => {
    try {
      // Try to get user info from a protected endpoint using authenticated fetch
      const response = await authenticatedFetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };  const login = async (email: string, password: string) => {
    try {
      const response = await csrfFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        
        // Clear any expired session flags after successful login
        if (typeof window !== 'undefined') {
          // Clear the expired parameter from URL if present
          const url = new URL(window.location.href);
          if (url.searchParams.has('expired')) {
            url.searchParams.delete('expired');
            window.history.replaceState({}, '', url.pathname + url.search);
          }
        }
        
        // Add a small delay to ensure session is fully established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };
  const signup = async (email: string, password: string, confirmPassword: string) => {
    try {
      const response = await csrfFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, confirmPassword }),
      });      const data = await response.json();

      if (response.ok) {
        // Always require email verification for new signups
        return { 
          success: true, 
          requiresVerification: true, 
          message: data.message || 'Account created successfully! Please check your email for verification instructions.' 
        };
      } else {
        return { success: false, error: data.error || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error' };
    }
  };
  const logout = async () => {
    try {
      await csrfFetch('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if request fails
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
