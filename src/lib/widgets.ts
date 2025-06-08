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

export class WidgetService {
  // Get user's dashboard layout
  static async getDashboardLayout(userId: string): Promise<DashboardLayout> {    
    // For now, return a default layout
    // In the future, this would be stored in the database
    return {
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
        }
      ],
      lastModified: new Date()
    };
  }

  // Update widget configuration
  static async updateWidget(userId: string, widgetId: string, updates: Partial<Widget>): Promise<Widget> {
    // Mock implementation - in a real app, this would update the database
    const layout = await this.getDashboardLayout(userId);
    const widget = layout.widgets.find(w => w.id === widgetId);
    
    if (!widget) {
      throw new Error('Widget not found');
    }

    return { ...widget, ...updates };
  }

  // Get a specific widget
  static async getWidget(userId: string, widgetId: string): Promise<Widget | null> {
    const layout = await this.getDashboardLayout(userId);
    return layout.widgets.find(w => w.id === widgetId) || null;
  }

  // Add a new widget
  static async addWidget(userId: string, widgetData: Omit<Widget, 'id'>): Promise<Widget> {
    // Mock implementation - generate a new ID and return the widget
    const newWidget: Widget = {
      ...widgetData,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    return newWidget;
  }

  // Remove a widget
  static async removeWidget(userId: string, widgetId: string): Promise<void> {
    // Mock implementation - in a real app, this would remove from database
    const layout = await this.getDashboardLayout(userId);
    const widgetIndex = layout.widgets.findIndex(w => w.id === widgetId);
    
    if (widgetIndex === -1) {
      throw new Error('Widget not found');
    }
    
    // In a real implementation, this would update the database
    console.log(`Widget ${widgetId} removed for user ${userId}`);
  }

  // Update the entire dashboard layout
  static async updateLayout(userId: string, widgets: Widget[]): Promise<void> {
    // Mock implementation - in a real app, this would update the database
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
          return await this.getActivityFeedData(userId, widget.config);
        
        case 'sharing-stats':
          return await this.getSharingStatsData(userId);
          case 'security-status':
          return await this.getSecurityStatusData(userId);
        
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

  private static async getFileStatsData(_userId: string, _config: WidgetConfig): Promise<unknown> {
    // Mock implementation
    return {
      chartData: [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 8 },
        { date: '2024-01-03', value: 12 },
        { date: '2024-01-04', value: 6 },
        { date: '2024-01-05', value: 15 }
      ]
    };
  }

  private static async getActivityFeedData(_userId: string, _config: WidgetConfig): Promise<unknown> {
    // Mock implementation
    return {
      activities: [
        { type: 'upload', description: 'Uploaded document.pdf', timestamp: new Date() },
        { type: 'share', description: 'Shared project-files.zip', timestamp: new Date() },
        { type: 'download', description: 'Downloaded image.jpg', timestamp: new Date() }
      ]
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

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
