// Dashboard Widgets Service
import { prisma } from './database';

export type WidgetType = 
  | 'storage-usage'
  | 'recent-files'
  | 'file-stats'
  | 'activity-feed'
  | 'sharing-stats'
  | 'security-status'
  | 'backup-status'
  | 'custom-notes'
  | 'quick-upload'
  | 'search-shortcuts';

export interface WidgetConfig {
  [key: string]: unknown;
  // Storage Usage Widget
  showPercentage?: boolean;
  showFileTypes?: boolean;
  
  // Recent Files Widget
  limit?: number;
  fileTypes?: string[];
  
  // Activity Feed Widget
  days?: number;
  
  // File Stats Widget
  chartType?: 'line' | 'bar' | 'pie';
  timeRange?: '7d' | '30d' | '90d' | '1y';
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; order?: number };
  size: { width: number; height: number; minHeight?: number };
  config: WidgetConfig;
  isVisible: boolean;
}

export interface DashboardLayout {
  widgets: Widget[];
  columns?: number;
  gap?: number;
  lastModified: Date;
}

export class WidgetService {  // Get user's dashboard layout
  static async getDashboardLayout(userId: string): Promise<DashboardLayout> {    
    // Try to get saved layout from database
    const savedLayout = await prisma.dashboardLayout.findUnique({
      where: { userId },
      select: {
        widgets: true,
        columns: true,
        gap: true,
        updatedAt: true
      }
    });    if (savedLayout) {
      return {
        widgets: JSON.parse(JSON.stringify(savedLayout.widgets)) as Widget[],
        columns: savedLayout.columns,
        gap: savedLayout.gap,
        lastModified: savedLayout.updatedAt
      };
    }

    // Return default layout for new users
    const defaultLayout: DashboardLayout = {
      columns: 12,
      gap: 16,
      widgets: [
        {
          id: 'storage-usage',
          type: 'storage-usage',
          title: 'Storage Usage',
          position: { x: 0, y: 0, order: 1 },
          size: { width: 6, height: 4 },
          config: { showPercentage: true, showFileTypes: true },
          isVisible: true
        },
        {
          id: 'recent-files',
          type: 'recent-files',
          title: 'Recent Files',
          position: { x: 6, y: 0, order: 2 },
          size: { width: 6, height: 4 },
          config: { limit: 5 },
          isVisible: true
        },
        {
          id: 'activity-feed',
          type: 'activity-feed',
          title: 'Recent Activity',
          position: { x: 0, y: 4, order: 3 },
          size: { width: 6, height: 4 },
          config: { days: 7 },
          isVisible: true
        },
        {
          id: 'sharing-stats',
          type: 'sharing-stats',
          title: 'Sharing Statistics',
          position: { x: 6, y: 4, order: 4 },
          size: { width: 6, height: 4 },
          config: {},
          isVisible: true
        }
      ],
      lastModified: new Date()
    };

    // Save the default layout to database
    await this.updateLayout(userId, defaultLayout.widgets);
    
    return defaultLayout;
  }  // Update widget configuration
  static async updateWidget(userId: string, widgetId: string, updates: Partial<Widget>): Promise<Widget> {
    // Get the current layout
    const layout = await this.getDashboardLayout(userId);
    const widgetIndex = layout.widgets.findIndex(w => w.id === widgetId);
    
    if (widgetIndex === -1) {
      throw new Error('Widget not found');
    }

    // Update the widget
    const updatedWidget = { ...layout.widgets[widgetIndex], ...updates };
    layout.widgets[widgetIndex] = updatedWidget;
    
    // Save the updated layout to database
    await this.updateLayout(userId, layout.widgets);
    
    return updatedWidget;
  }

  // Get a specific widget
  static async getWidget(userId: string, widgetId: string): Promise<Widget | null> {
    const layout = await this.getDashboardLayout(userId);
    return layout.widgets.find(w => w.id === widgetId) || null;
  }  // Add a new widget
  static async addWidget(userId: string, widgetData: Omit<Widget, 'id'>): Promise<Widget> {
    // Generate a unique ID for the new widget
    const newWidget: Widget = {
      ...widgetData,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Get current layout and add the new widget
    const layout = await this.getDashboardLayout(userId);
    layout.widgets.push(newWidget);
    
    // Save to database
    await this.updateLayout(userId, layout.widgets);
    
    return newWidget;
  }  // Remove a widget
  static async removeWidget(userId: string, widgetId: string): Promise<void> {
    // Get current layout
    const layout = await this.getDashboardLayout(userId);
    const widgetIndex = layout.widgets.findIndex(w => w.id === widgetId);
    
    if (widgetIndex === -1) {
      throw new Error('Widget not found');
    }
    
    // Remove the widget
    layout.widgets.splice(widgetIndex, 1);
    
    // Save updated layout to database
    await this.updateLayout(userId, layout.widgets);
    
    console.log(`Widget ${widgetId} removed for user ${userId}`);
  }  // Update the entire dashboard layout
  static async updateLayout(userId: string, widgets: Widget[]): Promise<void> {
    // Validate that the widgets array is valid
    if (!widgets || !Array.isArray(widgets)) {
      throw new Error('Invalid widgets array');
    }
    
    // Upsert the dashboard layout in the database
    await prisma.dashboardLayout.upsert({
      where: { userId },
      update: {
        widgets: JSON.parse(JSON.stringify(widgets)),
        updatedAt: new Date()
      },
      create: {
        userId,
        widgets: JSON.parse(JSON.stringify(widgets)),
        columns: 12,
        gap: 16
      }
    });
    
    console.log(`Layout updated for user ${userId} with ${widgets.length} widgets`);
  }

  // Get widget data for rendering
  static async getWidgetData(userId: string, widget: Widget): Promise<unknown> {
    try {
      switch (widget.type) {
        case 'storage-usage':
          return await this.getStorageUsageData(userId);
        
        case 'recent-files':
          return await this.getRecentFilesData(userId, widget.config);
        
        case 'file-stats':
          return await this.getFileStatsData(userId, widget.config);
        
        case 'activity-feed':
          return await this.getActivityFeedData(userId, widget.config);        case 'sharing-stats':
          return await this.getSharingStatsData(userId);
          
        case 'security-status':
          return await this.getSecurityStatusData(userId);
        
        case 'backup-status':
          return await this.getBackupStatusData(userId);
        
        case 'custom-notes':
          return await this.getCustomNotesData(userId, widget.config);
        
        case 'quick-upload':
          return { status: 'ready', message: 'Quick upload widget ready' };
        
        case 'search-shortcuts':
          return { shortcuts: ['documents', 'images', 'recent', 'shared'] };
        
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error getting widget data for ${widget.type}:`, error);
      return null;
    }
  }

  // Helper methods for getting specific widget data

  private static async getStorageUsageData(userId: string): Promise<unknown> {
    const files = await prisma.file.findMany({
      where: { userId },
      select: { fileSize: true, fileName: true }
    });

    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    const fileCount = files.length;
    
    // Mock storage limit (could be from user plan)
    const storageLimit = 5 * 1024 * 1024 * 1024; // 5GB
    const usagePercentage = (totalSize / storageLimit) * 100;

    return {
      totalSize,
      fileCount,
      storageLimit,
      usagePercentage,
      formattedSize: this.formatFileSize(totalSize),
      formattedLimit: this.formatFileSize(storageLimit)
    };
  }

  private static async getRecentFilesData(userId: string, config: WidgetConfig): Promise<unknown> {
    const limit = config.limit || 5;
    
    const files = await prisma.file.findMany({
      where: { userId },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit as number
    });

    return {
      files: files.map(file => ({
        ...file,
        formattedSize: this.formatFileSize(file.fileSize)
      }))
    };
  }
  private static async getFileStatsData(userId: string, config: WidgetConfig): Promise<unknown> {
    const timeRange = config.timeRange || '30d';
    const chartType = config.chartType || 'line';
    
    // Calculate date range
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get file creation data from database
    const files = await prisma.file.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        createdAt: true,
        fileSize: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group files by date
    const filesByDate = new Map<string, { count: number; size: number }>();
    
    // Initialize all dates in range with zero values
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      filesByDate.set(dateStr, { count: 0, size: 0 });
    }

    // Aggregate file data by date
    files.forEach(file => {
      const dateStr = file.createdAt.toISOString().split('T')[0];
      const existing = filesByDate.get(dateStr) || { count: 0, size: 0 };
      filesByDate.set(dateStr, {
        count: existing.count + 1,
        size: existing.size + file.fileSize
      });
    });

    // Convert to chart data array
    const chartData = Array.from(filesByDate.entries()).map(([date, data]) => ({
      date,
      files: data.count,
      size: data.size,
      value: chartType === 'line' ? data.count : data.size
    }));

    return {
      chartData,
      chartType,
      timeRange,
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.fileSize, 0)
    };
  }  private static async getActivityFeedData(userId: string, config: WidgetConfig): Promise<unknown> {
    const days = config.days || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get recent activities from the activity log
    const activities = await prisma.activityLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        action: true,
        entityType: true,
        entityId: true,
        details: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // If we don't have enough activity log data, supplement with file/sharing data
    if (activities.length < 10) {
      const [recentFiles, recentSharedLinks] = await Promise.all([
        prisma.file.findMany({
          where: {
            userId,
            createdAt: { gte: startDate }
          },
          select: {
            fileName: true,
            createdAt: true,
            fileSize: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.sharedLink.findMany({
          where: {
            userId,
            createdAt: { gte: startDate }
          },
          select: {
            createdAt: true,
            views: true,
            downloads: true,
            file: {
              select: { fileName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      // Add file upload activities
      recentFiles.forEach(file => {
        activities.push({
          action: 'upload',
          entityType: 'file',
          entityId: null,
          details: { fileName: file.fileName, fileSize: file.fileSize },
          createdAt: file.createdAt
        });
      });

      // Add sharing activities
      recentSharedLinks.forEach(link => {
        activities.push({
          action: 'share',
          entityType: 'file',
          entityId: null,
          details: { fileName: link.file.fileName, views: link.views, downloads: link.downloads },
          createdAt: link.createdAt
        });
      });
    }

    // Format activities for display
    const formattedActivities = activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 15)
      .map(activity => {
        const details = activity.details as Record<string, unknown> || {};
        return {
          type: activity.action,
          description: this.formatActivityDescription(activity.action, activity.entityType, details),
          timestamp: activity.createdAt,
          details
        };
      });
    
    return {
      activities: formattedActivities,
      timeRange: `${days} days`,
      totalActivities: formattedActivities.length
    };
  }

  private static async getSharingStatsData(userId: string): Promise<unknown> {
    const sharedLinks = await prisma.sharedLink.findMany({
      where: { userId },
      include: {
        file: {
          select: { fileName: true }
        }
      }
    });

    const totalShares = sharedLinks.length;
    const totalViews = sharedLinks.reduce((sum, link) => sum + link.views, 0);
    const totalDownloads = sharedLinks.reduce((sum, link) => sum + link.downloads, 0);

    return {
      totalShares,
      totalViews,
      totalDownloads,
      activeLinks: sharedLinks.filter(link => link.isActive).length
    };
  }

  private static async getSecurityStatusData(userId: string): Promise<unknown> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        twoFactorEnabled: true
      }
    });

    return {
      emailVerified: user?.emailVerified || false,
      twoFactorEnabled: user?.twoFactorEnabled || false,
      encryptionEnabled: true, // All files are encrypted
      securityScore: this.calculateSecurityScore(user)
    };
  }

  private static calculateSecurityScore(user: { twoFactorEnabled?: boolean; emailVerified?: boolean } | null): number {
    let score = 0;
    if (user?.emailVerified) score += 25;
    if (user?.twoFactorEnabled) score += 50;
    score += 25; // Base encryption
    return score;
  }
  private static formatActivityDescription(action: string, entityType: string, details: Record<string, unknown>): string {
    const fileName = details.fileName as string || 'Unknown file';
    
    switch (action) {
      case 'upload':
        return `Uploaded ${fileName}`;
      case 'download':
        return `Downloaded ${fileName}`;
      case 'share':
        return `Shared ${fileName}`;
      case 'delete':
        return `Deleted ${fileName}`;
      case 'update':
        return `Updated ${fileName}`;
      case 'view':
        return `Viewed ${fileName}`;
      case 'folder_create':
        return `Created folder ${details.folderName || 'New Folder'}`;
      case 'folder_delete':
        return `Deleted folder ${details.folderName || 'Folder'}`;
      default:
        return `${action} ${entityType}`;
    }
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static async getBackupStatusData(userId: string): Promise<unknown> {
    // Get user's file statistics for backup status
    const stats = await prisma.file.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { fileSize: true }
    });

    const totalFiles = stats._count.id || 0;
    const totalSize = stats._sum.fileSize || 0;

    // Simulate backup status (in a real app, this would check actual backup systems)
    const lastBackup = new Date();
    lastBackup.setHours(lastBackup.getHours() - 24); // Last backup 24 hours ago

    return {
      totalFiles,
      totalSize: this.formatFileSize(totalSize),
      lastBackup,
      backupStatus: 'completed',
      nextBackup: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next backup in 24 hours
      backupEnabled: true
    };
  }

  private static async getCustomNotesData(userId: string, config: WidgetConfig): Promise<unknown> {
    // In a real implementation, you might store custom notes in a separate table
    // For now, we'll return a simple structure
    const noteContent = config.noteContent as string || 'Click to add your custom notes...';
    const lastModified = config.lastModified as string || new Date().toISOString();

    return {
      content: noteContent,
      lastModified: new Date(lastModified),
      canEdit: true,
      maxLength: 1000
    };
  }
}
