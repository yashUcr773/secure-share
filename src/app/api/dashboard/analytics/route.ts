import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';

// GET /api/dashboard/analytics - Get analytics data for the current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    
    // TODO: Get user ID from authentication
    const userId = 'anonymous'; // Placeholder
    
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
    };
    
    return NextResponse.json({
      success: true,
      analytics: analyticsData,
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
