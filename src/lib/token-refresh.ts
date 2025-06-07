// Token refresh utility for SecureShare
// Handles automatic token refresh when access tokens expire

interface RefreshResult {
  success: boolean;
  error?: string;
}

class TokenRefreshService {
  private static instance: TokenRefreshService;
  private refreshPromise: Promise<RefreshResult> | null = null;
  private isRefreshing = false;
  
  static getInstance(): TokenRefreshService {
    if (!TokenRefreshService.instance) {
      TokenRefreshService.instance = new TokenRefreshService();
    }
    return TokenRefreshService.instance;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshToken(): Promise<RefreshResult> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<RefreshResult> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return { 
          success: false, 
          error: data.error || 'Token refresh failed' 
        };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return { 
        success: false, 
        error: 'Network error during token refresh' 
      };
    }
  }

  /**
   * Check if a response indicates an expired token
   */  isTokenExpiredResponse(response: Response): boolean {
    return response.status === 401 && 
           (response.headers.get('content-type')?.includes('application/json') ?? false);
  }

  /**
   * Retry a failed request after refreshing the token
   */
  async retryWithRefresh(
    originalRequest: () => Promise<Response>
  ): Promise<Response> {
    const refreshResult = await this.refreshToken();
    
    if (refreshResult.success) {
      // Retry the original request
      return originalRequest();    } else {
      // Refresh failed, redirect to login
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      window.location.href = `${baseUrl}/auth/login?expired=true`;
      throw new Error('Session expired. Please log in again.');
    }
  }
}

// Enhanced fetch wrapper that handles token refresh automatically
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const tokenService = TokenRefreshService.getInstance();
  
  // Make the original request
  const makeRequest = () => fetch(url, {
    ...options,
    credentials: 'include', // Include cookies
  });

  let response = await makeRequest();
  
  // If token expired, try to refresh and retry
  if (tokenService.isTokenExpiredResponse(response)) {
    response = await tokenService.retryWithRefresh(makeRequest);
  }
  
  return response;
}

// Export the singleton instance
export const tokenRefreshService = TokenRefreshService.getInstance();

// Auto-refresh tokens before they expire (optional)
export function startTokenRefreshTimer() {
  // Refresh token every 14 minutes (1 minute before 15-minute expiry)
  const refreshInterval = 14 * 60 * 1000; // 14 minutes
  
  setInterval(async () => {
    try {
      await tokenRefreshService.refreshToken();
    } catch (error) {
      console.error('Automatic token refresh failed:', error);
    }
  }, refreshInterval);
}
