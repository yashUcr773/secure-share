// Database service layer for SecureShare
// Provides data access with proper concurrency and transaction support

import { PrismaClient } from '../generated/prisma';
import type { User, File, Folder, SharedLink, Session } from '../generated/prisma';

// Create a singleton Prisma client with connection pooling
class DatabaseService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }
    return DatabaseService.instance;
  }

  static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$disconnect();
    }
  }
}

export const prisma = DatabaseService.getInstance();

// User management functions
export class UserService {
  static async createUser(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        name: data.name?.trim(),
      },
    });
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });
  }

  static async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }  static async updateUser(id: string, data: Partial<Pick<User, 'email' | 'name' | 'passwordHash' | 'emailVerified' | 'emailVerificationToken' | 'emailVerificationTokenExpiry' | 'passwordResetToken' | 'passwordResetTokenExpiry' | 'twoFactorEnabled' | 'twoFactorSecret' | 'twoFactorBackupCodes'>>): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : undefined,
      name: data.name ? data.name.trim() : undefined,
    };
    
    // Handle JSON field properly
    if (data.twoFactorBackupCodes !== undefined) {
      updateData.twoFactorBackupCodes = data.twoFactorBackupCodes;
    }
    
    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteUser(id: string): Promise<void> {
    // This will cascade delete all related data due to Prisma schema relations
    await prisma.user.delete({
      where: { id },
    });
  }

  static async getUserStats(userId: string): Promise<{
    totalFiles: number;
    totalFolders: number;
    totalSharedLinks: number;
  }> {
    const [totalFiles, totalFolders, totalSharedLinks] = await Promise.all([
      prisma.file.count({ where: { userId } }),
      prisma.folder.count({ where: { userId } }),
      prisma.sharedLink.count({ where: { userId } }),
    ]);

    return { totalFiles, totalFolders, totalSharedLinks };
  }

  static async getUserByPasswordResetToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        isActive: true,
      },
    });
  }

  static async getUserByEmailVerificationToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        isActive: true,
      },
    });
  }
}

// Session management for JWT tokens
export class SessionService {
  static async createSession(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<Session> {
    console.log('🔧 [SESSION DEBUG] Creating session:', data);
    const session = await prisma.session.create({
      data,
    });
    console.log('✅ [SESSION DEBUG] Session created:', session);
    return session;
  }

  static async getValidSession(token: string): Promise<Session | null> {
    console.log('🔧 [SESSION DEBUG] Looking for valid session with token:', token);
    console.log('🔧 [SESSION DEBUG] Current time:', new Date());
    
    const session = await prisma.session.findFirst({
      where: {
        token,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
    
    if (session) {
      console.log('✅ [SESSION DEBUG] Valid session found:', {
        id: session.id,
        userId: session.userId,
        token: session.token,
        isRevoked: session.isRevoked,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      });
    } else {
      console.log('❌ [SESSION DEBUG] No valid session found');
      
      // Let's check if the session exists but doesn't meet criteria
      const anySession = await prisma.session.findFirst({
        where: { token }
      });
      
      if (anySession) {
        console.log('🔧 [SESSION DEBUG] Session exists but invalid:', {
          id: anySession.id,
          userId: anySession.userId,
          token: anySession.token,
          isRevoked: anySession.isRevoked,
          expiresAt: anySession.expiresAt,
          createdAt: anySession.createdAt,
          isExpired: anySession.expiresAt < new Date()
        });
      } else {
        console.log('🔧 [SESSION DEBUG] Session does not exist at all');
      }
    }
    
    return session;
  }

  static async revokeSession(token: string): Promise<void> {
    await prisma.session.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  static async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  static async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { isRevoked: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
    return result.count;
  }
}

// File management with proper concurrency
export class FileService {  static async createFile(data: {
    fileName: string;
    fileSize: number;
    encryptedContent: string;
    salt: string;
    iv: string;
    key?: string;
    isPasswordProtected: boolean;
    userId?: string; // Optional for anonymous uploads
    folderId?: string;
  }): Promise<File> {
    return prisma.file.create({
      data,
    });
  }

  static async getFile(id: string): Promise<File | null> {
    return prisma.file.findUnique({
      where: { id },
      include: {
        folder: true,
        user: true,
      },
    });
  }
  static async getFileMetadata(id: string): Promise<Omit<File, 'encryptedContent'> | null> {
    return prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        salt: true,
        iv: true,
        key: true,
        isPasswordProtected: true,
        folderId: true,
        userId: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        folder: true,
        user: true,
      },
    });
  }

  static async getUserFiles(userId: string, folderId?: string): Promise<Omit<File, 'encryptedContent'>[]> {
    return prisma.file.findMany({
      where: {
        userId,
        folderId: folderId || null,
      },      select: {
        id: true,
        fileName: true,
        fileSize: true,
        salt: true,
        iv: true,
        key: true,
        isPasswordProtected: true,
        folderId: true,
        userId: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        folder: true,
        user: false, // Don't include full user data
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async updateFile(id: string, data: Partial<Pick<File, 'fileName' | 'folderId'>>): Promise<File> {
    return prisma.file.update({
      where: { id },
      data,
    });
  }

  static async deleteFile(id: string): Promise<void> {
    // This will cascade delete related shared links
    await prisma.file.delete({
      where: { id },
    });
  }

  static async moveToFolder(fileId: string, folderId: string | null): Promise<File> {
    return prisma.file.update({
      where: { id: fileId },
      data: { folderId },
    });
  }

  static async getUserFilesByIds(userId: string, fileIds: string[]): Promise<File[]> {
    return prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId,
      },
    });
  }
}

// Folder management
export class FolderService {
  static async createFolder(data: {
    name: string;
    description?: string;
    parentId?: string;
    userId: string;
  }): Promise<Folder> {
    return prisma.folder.create({
      data,
    });
  }

  static async getFolder(id: string): Promise<Folder | null> {
    return prisma.folder.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        files: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            isPasswordProtected: true,
            createdAt: true,
          },
        },
      },
    });
  }

  static async getUserFolders(userId: string, parentId?: string): Promise<Folder[]> {
    return prisma.folder.findMany({
      where: {
        userId,
        parentId: parentId || null,
      },
      include: {
        children: true,
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  static async updateFolder(id: string, data: Partial<Pick<Folder, 'name' | 'description' | 'parentId'>>): Promise<Folder> {
    return prisma.folder.update({
      where: { id },
      data,
    });
  }

  static async deleteFolder(id: string): Promise<void> {
    // First move all files and subfolders to parent or root
    await prisma.$transaction(async (tx) => {
      const folder = await tx.folder.findUnique({
        where: { id },
        include: { files: true, children: true },
      });

      if (folder) {
        // Move files to parent folder or root
        await tx.file.updateMany({
          where: { folderId: id },
          data: { folderId: folder.parentId },
        });

        // Move subfolders to parent folder or root
        await tx.folder.updateMany({
          where: { parentId: id },
          data: { parentId: folder.parentId },
        });

        // Delete the folder
        await tx.folder.delete({
          where: { id },
        });
      }
    });
  }
}

// Shared link management with analytics
export class SharedLinkService {
  static async createSharedLink(data: {
    fileId: string;
    userId: string;
    expiresAt?: Date;
  }): Promise<SharedLink> {
    return prisma.sharedLink.create({
      data,
    });
  }

  static async getSharedLink(fileId: string): Promise<SharedLink | null> {
    return prisma.sharedLink.findUnique({
      where: { fileId },
      include: {
        file: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            isPasswordProtected: true,
            userId: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  static async getUserSharedLinks(userId: string): Promise<SharedLink[]> {
    return prisma.sharedLink.findMany({
      where: { userId },
      include: {
        file: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            isPasswordProtected: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }  static async updateAnalytics(fileId: string, type: 'view' | 'download'): Promise<void> {
    try {
      // Get the file to check if it exists and has a userId
      const file = await FileService.getFile(fileId);
      if (!file) {
        console.warn(`File ${fileId} not found, skipping analytics update`);
        return;
      }

      // Skip analytics for anonymous files since SharedLink requires userId
      if (!file.userId) {
        console.log(`Skipping analytics for anonymous file ${fileId}`);
        return;
      }

      // Use upsert to create shared link if it doesn't exist, or update if it does
      await prisma.sharedLink.upsert({
        where: { fileId },
        update: {
          [type === 'view' ? 'views' : 'downloads']: {
            increment: 1,
          },
        },
        create: {
          fileId,
          userId: file.userId,
          [type === 'view' ? 'views' : 'downloads']: 1,
        }
      });
    } catch (error) {
      console.error(`Failed to update analytics for file ${fileId}:`, error);
      // Don't throw the error - analytics should not break file access
    }
}

  static async toggleSharedLink(fileId: string, isActive: boolean): Promise<SharedLink> {
    return prisma.sharedLink.update({
      where: { fileId },
      data: { isActive },
    });
  }

  static async deleteSharedLink(fileId: string): Promise<void> {
    await prisma.sharedLink.delete({
      where: { fileId },
    });
  }

  static async isSharedLinkValid(fileId: string): Promise<boolean> {
    const link = await prisma.sharedLink.findUnique({
      where: { fileId },
    });

    if (!link || !link.isActive) {
      return false;
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return false;
    }

    return true;
  }
}

// Rate limiting service
export class RateLimitService {  
    static async checkRateLimit(
    identifier: string,
    action: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const windowStart = new Date();
    windowStart.setMilliseconds(windowStart.getMilliseconds() - windowMs);

    const expiresAt = new Date(Date.now() + windowMs);

    // Clean up old entries first
    await prisma.rateLimitEntry.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    try {
      // Use a more atomic approach with upsert to avoid race conditions
      // First, try to find an existing valid entry
      const existing = await prisma.rateLimitEntry.findFirst({
        where: {
          identifier,
          action,
          windowStart: {
            gte: windowStart,
          },
        },
      });

      if (existing) {
        if (existing.count >= limit) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: existing.expiresAt,
          };
        }

        // Try to update, but handle the case where it might have been deleted
        try {
          const updated = await prisma.rateLimitEntry.update({
            where: { id: existing.id },
            data: {
              count: {
                increment: 1,
              },
            },
          });

          return {
            allowed: true,
            remaining: limit - updated.count,
            resetTime: updated.expiresAt,
          };
        } catch (updateError) {
          console.log("🚀 ~ RateLimitService ~ updateError:", updateError)
          // If update fails (record not found), fall through to create a new one
          console.warn('Rate limit entry was deleted during update, creating new entry');
        }
      }

      // Create new entry (either no existing entry found or update failed)
      const newEntry = await prisma.rateLimitEntry.create({
        data: {
          identifier,
          action,
          count: 1,
          windowStart: new Date(),
          expiresAt,
        },
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: newEntry.expiresAt,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // In case of any error, allow the request but log it
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: expiresAt,
      };
    }
  }
}

// Storage statistics service
export class StorageService {
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalUsers: number;
    totalSize: number;
    totalSharedLinks: number;
    activeSharedLinks: number;
  }> {
    const [totalFiles, totalUsers, totalSharedLinks, activeSharedLinks, sizeAgg] = await Promise.all([
      prisma.file.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.sharedLink.count(),
      prisma.sharedLink.count({ where: { isActive: true } }),
      prisma.file.aggregate({
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    return {
      totalFiles,
      totalUsers,
      totalSize: sizeAgg._sum.fileSize || 0,
      totalSharedLinks,
      activeSharedLinks,
    };
  }

  static async cleanupOldFiles(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.file.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  static async getFileAnalytics(userId: string, timeRange: '7d' | '30d' | '90d'): Promise<{
    totalViews: number;
    totalDownloads: number;
    totalShares: number;
    activeLinks: number;
    recentActivity: Array<{
      fileName: string;
      views: number;
      downloads: number;
      shares: number;
      createdAt: Date;
    }>;
  }> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sharedLinks = await prisma.sharedLink.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        file: {
          select: {
            fileName: true,
            createdAt: true,
          },
        },
      },
    });

    const totalViews = sharedLinks.reduce((sum, link) => sum + link.views, 0);
    const totalDownloads = sharedLinks.reduce((sum, link) => sum + link.downloads, 0);
    const totalShares = sharedLinks.length;
    const activeLinks = sharedLinks.filter(link => 
      link.isActive && (!link.expiresAt || link.expiresAt > new Date())
    ).length;

    const recentActivity = sharedLinks
      .map(link => ({
        fileName: link.file.fileName,
        views: link.views,
        downloads: link.downloads,
        shares: 1,
        createdAt: link.file.createdAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalViews,
      totalDownloads,
      totalShares,
      activeLinks,
      recentActivity,
    };
  }
}

// Database health and maintenance
export class DatabaseMaintenanceService {
  static async performMaintenance(): Promise<{
    sessionsCleanedUp: number;
    rateLimitEntriesCleanedUp: number;
  }> {
    const [sessionsCleanedUp, rateLimitResult] = await Promise.all([
      SessionService.cleanupExpiredSessions(),
      prisma.rateLimitEntry.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return {
      sessionsCleanedUp,
      rateLimitEntriesCleanedUp: rateLimitResult.count,
    };
  }

  static async getDatabaseHealth(): Promise<{
    isConnected: boolean;
    latency: number;
    statistics: {
      users: number;
      files: number;
      sessions: number;
      sharedLinks: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      const [users, files, sessions, sharedLinks] = await Promise.all([
        prisma.user.count(),
        prisma.file.count(),
        prisma.session.count(),
        prisma.sharedLink.count(),
      ]);

      const latency = Date.now() - startTime;

      return {
        isConnected: true,
        latency,
        statistics: {
          users,
          files,
          sessions,
          sharedLinks,
        },
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        isConnected: false,
        latency: Date.now() - startTime,
        statistics: {
          users: 0,
          files: 0,
          sessions: 0,
          sharedLinks: 0,
        },
      };
    }
  }
}

// Transaction helper
export class TransactionService {
  static async executeTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(fn);
  }
}

// Export the singleton instance for direct use
export { DatabaseService };
export { prisma as database };  // Export as database alias for backwards compatibility
export default prisma;
