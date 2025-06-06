import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';
import { EdgeAuthService } from '@/lib/auth-edge';
import { generalRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, sanitizeInput } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

// GET /api/dashboard/analytics - Get analytics data for the current user
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = createRateLimitIdentifier(request, 'analytics');
    const rateLimitResult = await checkRateLimit(request, generalRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
    }

    // Validate request origin (CSRF protection)
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    ];
    
    if (!validateOrigin(request, allowedOrigins)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      ));
    }

    // Authentication check
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    let userId = 'anonymous';
    try {
      const payload = await EdgeAuthService.verifyToken(token);
      if (payload) {
        userId = payload.userId;
      } else {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ));
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const { searchParams } = new URL(request.url);
    const timeRange = sanitizeInput(searchParams.get('timeRange') || '30d');
    
    // Get user's shared links for analytics
    const sharedLinks = await FileStorage.getUserSharedLinks(userId);
    const userFiles = await FileStorage.getUserFiles(userId);
    
    // Calculate analytics
    const totalViews = sharedLinks.reduce((sum, link) => sum + link.views, 0);
    const totalDownloads = sharedLinks.reduce((sum, link) => sum + link.downloads, 0);
    const totalShares = sharedLinks.length;
    const activeLinks = sharedLinks.filter(link => 
      link.isActive && (!link.expiresAt || new Date(link.expiresAt) > new Date())
    ).length;
    
    // Generate mock recent activity based on real files
    const recentActivity = sharedLinks
      .slice(0, 10)
      .map((link, index) => ({
        id: `activity-${index}`,
        type: index % 3 === 0 ? 'view' : index % 3 === 1 ? 'download' : 'share',
        fileName: link.fileName,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        userAgent: ['Chrome on Windows', 'Safari on macOS', 'Firefox on Linux'][index % 3],
      }));
    
    // Popular files based on actual analytics
    const popularFiles = sharedLinks
      .sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads))
      .slice(0, 5)
      .map(link => ({
        id: link.id,
        fileName: link.fileName,
        views: link.views,
        downloads: link.downloads,
        shares: 1, // Each shared link represents one share
      }));
    
    // Generate views over time data based on timeRange
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const viewsOverTime = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * totalViews / days * 2), // Distribute views randomly
        downloads: Math.floor(Math.random() * totalDownloads / days * 2),
      };
    });
    
    const analyticsData = {
      totalViews,
      totalDownloads,
      totalShares,
      activeLinks,
      recentActivity,
      popularFiles,
      viewsOverTime,
    };    const response = NextResponse.json({
      success: true,
      analytics: analyticsData,
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Analytics error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
