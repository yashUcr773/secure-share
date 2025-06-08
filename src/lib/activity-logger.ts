// Activity Logging Service
// Provides a centralized way to log user activities to the ActivityLog table

import { prisma } from './database';
import { Prisma } from '@/generated/prisma';

export type ActivityType = 
  | 'file_upload'
  | 'file_download'
  | 'file_view'
  | 'file_delete'
  | 'file_share'
  | 'shared_link_created'
  | 'shared_link_deleted'
  | 'shared_link_accessed'
  | 'folder_created'
  | 'folder_deleted'
  | 'user_login'
  | 'user_logout'
  | 'user_signup'
  | 'profile_updated'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'account_deleted'
  | 'admin_action'
  | 'security_alert';

export interface ActivityData {
  action: ActivityType;
  userId?: string;
  entityType: string;
  entityId?: string;
  details?: Prisma.JsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Prisma.JsonValue | null;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  user?: {
    id: string;
    email: string;
  };
}

class ActivityLogger {
  private static instance: ActivityLogger;

  private constructor() {}

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }
  /**
   * Log an activity to the database
   */
  async log(data: ActivityData): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          action: data.action,
          userId: data.userId || '',
          entityType: data.entityType,
          entityId: data.entityId || null,
          details: data.details || undefined,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      // Don't let activity logging failures break the main functionality
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Log multiple activities in batch
   */
  async logBatch(activities: ActivityData[]): Promise<void> {
    try {
      await prisma.activityLog.createMany({
        data: activities.map(activity => ({
          action: activity.action,
          userId: activity.userId || '',
          entityType: activity.entityType,
          entityId: activity.entityId || null,
          details: activity.details || undefined,
          ipAddress: activity.ipAddress || null,
          userAgent: activity.userAgent || null,
          createdAt: new Date(),
        })),
      });
    } catch (error) {
      console.error('Failed to log activities in batch:', error);
    }
  }

  /**
   * Get recent activities for a user
   */
  async getUserActivities(userId: string, limit: number = 10): Promise<ActivityRecord[]> {
    try {
      const activities = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });      return activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        details: activity.details,
        createdAt: activity.createdAt,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
      }));
    } catch (error) {
      console.error('Failed to get user activities:', error);
      return [];
    }
  }

  /**
   * Get recent activities across all users (admin view)
   */
  async getRecentActivities(limit: number = 50): Promise<ActivityRecord[]> {
    try {
      const activities = await prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });      return activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        details: activity.details,
        createdAt: activity.createdAt,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        user: activity.user,
      }));
    } catch (error) {
      console.error('Failed to get recent activities:', error);
      return [];
    }
  }

  /**
   * Clean up old activity logs (for maintenance)
   */
  async cleanupOldLogs(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.activityLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old activity logs:', error);
      return 0;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(userId?: string, days: number = 30): Promise<Record<ActivityType, number>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const whereClause: {
        createdAt: { gte: Date };
        userId?: string;
      } = {
        createdAt: {
          gte: cutoffDate,
        },
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const activities = await prisma.activityLog.findMany({
        where: whereClause,
        select: {
          action: true,
        },
      });

      const stats: Record<string, number> = {};
      activities.forEach(activity => {
        stats[activity.action] = (stats[activity.action] || 0) + 1;
      });

      return stats as Record<ActivityType, number>;
    } catch (error) {
      console.error('Failed to get activity stats:', error);
      return {} as Record<ActivityType, number>;
    }
  }
}

// Helper functions for common activity types
export const ActivityHelpers = {
  /**
   * Log file upload activity
   */
  async logFileUpload(userId: string | undefined, fileName: string, fileSize: number, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'file_upload',
      userId,
      entityType: 'file',
      details: { fileName, fileSize },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log file download activity
   */
  async logFileDownload(userId: string | undefined, fileName: string, fileId: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'file_download',
      userId,
      entityType: 'file',
      entityId: fileId,
      details: { fileName, fileId },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log file view activity
   */
  async logFileView(userId: string | undefined, fileName: string, fileId: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'file_view',
      userId,
      entityType: 'file',
      entityId: fileId,
      details: { fileName, fileId },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log file delete activity
   */
  async logFileDelete(userId: string, fileName: string, fileId: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'file_delete',
      userId,
      entityType: 'file',
      entityId: fileId,
      details: { fileName, fileId },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log shared link creation
   */
  async logSharedLinkCreated(userId: string, fileName: string, fileId: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'shared_link_created',
      userId,
      entityType: 'file',
      entityId: fileId,
      details: { fileName, fileId },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log shared link deletion
   */
  async logSharedLinkDeleted(userId: string, fileName: string, fileId: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'shared_link_deleted',
      userId,
      entityType: 'file',
      entityId: fileId,
      details: { fileName, fileId },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log shared link access
   */
  async logSharedLinkAccessed(fileName: string, fileId: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'shared_link_accessed',
      entityType: 'file',
      entityId: fileId,
      details: { fileName, fileId },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log user authentication events
   */
  async logUserLogin(userId: string, email: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'user_login',
      userId,
      entityType: 'user',
      entityId: userId,
      details: { email },
      ipAddress,
      userAgent,
    });
  },

  async logUserLogout(userId: string, email: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'user_logout',
      userId,
      entityType: 'user',
      entityId: userId,
      details: { email },
      ipAddress,
      userAgent,
    });
  },

  async logUserSignup(userId: string, email: string, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'user_signup',
      userId,
      entityType: 'user',
      entityId: userId,
      details: { email },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log security events
   */
  async logSecurityAlert(userId: string | undefined, alertType: string, description: string, metadata?: Record<string, unknown>, ipAddress?: string, userAgent?: string) {
    const logger = ActivityLogger.getInstance();
    await logger.log({
      action: 'security_alert',
      userId,
      entityType: 'security',
      details: { alertType, description, ...metadata },
      ipAddress,
      userAgent,
    });
  },
};

export default ActivityLogger;
